<?php

namespace App\Http\Controllers\Admin\Section;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Section\StoreSectionRequest;
use App\Http\Requests\Admin\Section\UpdateSectionRequest;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SectionController extends Controller
{
    public function index(Request $request)
    {
        $query = Section::query()->with('year');

        if ($request->filled('year_id')) {
            $query->where('year_id', $request->input('year_id'));
        }

        // Admin bisa lihat draft & published (R-ADMIN-03), tidak pakai scopePublished
        return $query->orderBy('order')->get();
    }

    public function store(StoreSectionRequest $request)
    {
        $data = $request->validated();
        $data['type'] ??= 'reading';

        // Guard pasangan type <-> order=8 (order 8 dipesan khusus case_study,
        // ditegakkan di layer aplikasi karena bukan constraint DB — lihat progress.md)
        if ($data['type'] === 'case_study') {
            if (isset($data['order']) && (int) $data['order'] !== Section::CASE_STUDY_ORDER) {
                return response()->json([
                    'message' => 'Section bertipe case_study wajib berada di order 8.',
                    'errors' => ['order' => ['Order untuk section case_study harus 8.']],
                ], 422);
            }
            $data['order'] = Section::CASE_STUDY_ORDER; // dipaksa, abaikan apa pun yang dikirim/kosong
        } elseif (isset($data['order']) && (int) $data['order'] === Section::CASE_STUDY_ORDER) {
            return response()->json([
                'message' => 'Order 8 dipesan khusus untuk section bertipe case_study.',
                'errors' => ['order' => ['Section bacaan tidak boleh memakai order 8.']],
            ], 422);
        }

        $section = DB::transaction(function () use ($data) {
            if ($data['type'] === 'case_study') {
                // Cegah duplikat case_study per year lebih awal & lebih jelas
                // pesannya daripada menunggu duplicate-entry dari unique constraint (year_id, order).
                $exists = Section::where('year_id', $data['year_id'])
                    ->where('type', 'case_study')
                    ->lockForUpdate()
                    ->exists();

                if ($exists) {
                    abort(422, 'Year ini sudah punya section studi kasus.');
                }
            } else {
                // lockForUpdate() mencegah 2 request store() bersamaan
                // membaca max('order') yang sama lalu insert dengan order yang sama
                $maxOrder = Section::where('year_id', $data['year_id'])
                    ->lockForUpdate()
                    ->max('order');

                $nextOrder = $maxOrder === null ? 1 : $maxOrder + 1;
                if ($nextOrder === Section::CASE_STUDY_ORDER) {
                    // Slot 8 dipesan case_study — lompati walau case_study itu
                    // sendiri belum dibuat (order tetap dihitung dari maxOrder keseluruhan,
                    // jadi kalau case_study SUDAH ada di 8, maxOrder+1 otomatis jadi 9 dan baris ini tidak ke-trigger).
                    $nextOrder++;
                }

                $data['order'] ??= $nextOrder;
            }

            return Section::create([
                ...$data,
                'is_published' => false, // selalu draft saat dibuat (R-ADMIN-03)
            ]);
        });

        return response()->json($section, 201);
    }

    public function show(Section $section)
    {
        // R-SECT-05: admin selalu bisa melihat seluruh section apa pun status lock-nya.
        return $section->load(['contentBlocks', 'year.era']);
    }

    public function update(UpdateSectionRequest $request, Section $section)
    {
        // 'order' sengaja TIDAK bisa diubah lewat endpoint ini.
        // Reorder/drag-drop harus lewat endpoint reorder() di bawah,
        // supaya tidak bentrok dengan unique constraint (year_id, order).
        //
        // 'type' juga sengaja TIDAK bisa diubah lewat endpoint ini — section
        // case_study tidak boleh disulap jadi reading (atau sebaliknya) setelah
        // dibuat, supaya pasangan type<->order=8 yang dijaga di store() tidak
        // bisa dilewati lewat update biasa.
        $data = $request->validated();
        unset($data['order'], $data['type']);

        $section->update($data);

        return $section;
    }

    public function reorder(Request $request, $yearId)
    {
        $request->validate([
            'section_ids' => 'required|array',
            'section_ids.*' => 'exists:sections,id',
        ]);

        $ids = $request->input('section_ids');

        // Guard eksplisit: tolak kalau ada section_id yang bukan milik year ini,
        // daripada diam-diam di-skip (silent skip bikin bug frontend/drag-drop
        // susah dilacak karena tidak ada sinyal error sama sekali).
        $ownedCount = Section::where('year_id', $yearId)
            ->whereIn('id', $ids)
            ->count();

        if ($ownedCount !== count($ids)) {
            return response()->json([
                'message' => 'Satu atau lebih section_id tidak ditemukan dalam year ini.',
                'errors' => [
                    'section_ids' => ['Semua section_id harus milik year yang sama dengan yang direorder.'],
                ],
            ], 422);
        }

        // Section case_study (order=8) tidak boleh ikut direorder — front-end
        // seharusnya tidak pernah mengirim id-nya, tapi ditolak eksplisit di sini
        // juga supaya tidak silent-skip kalau suatu saat ada caller lain.
        $caseStudyIdsSent = Section::where('year_id', $yearId)
            ->where('type', 'case_study')
            ->whereIn('id', $ids)
            ->pluck('id');

        if ($caseStudyIdsSent->isNotEmpty()) {
            return response()->json([
                'message' => 'Section studi kasus (order 8) tidak boleh disertakan dalam reorder.',
                'errors' => [
                    'section_ids' => ['Section bertipe case_study tidak boleh ikut direorder — order-nya tetap 8.'],
                ],
            ], 422);
        }

        DB::transaction(function () use ($ids, $yearId) {
            // Step 1: geser semua order ke angka besar dulu (hindari collision
            // dengan unique constraint saat swap di tengah proses)
            Section::where('year_id', $yearId)
                ->whereIn('id', $ids)
                ->update(['order' => DB::raw('`order` + 100000')]);

            // Step 2: assign order final sesuai urutan yang dikirim dari frontend,
            // MELOMPATI slot 8 yang dipesan untuk case_study — section bacaan
            // hanya memakai order 1-7 dan 9 (lihat progress.md).
            foreach ($ids as $index => $sectionId) {
                $order = $index + 1;
                if ($order >= Section::CASE_STUDY_ORDER) {
                    $order++;
                }

                Section::where('id', $sectionId)
                    ->where('year_id', $yearId) // guard tambahan, sekarang jadi belt-and-suspenders
                    ->update(['order' => $order]);
            }
        });

        return response()->json(
            Section::where('year_id', $yearId)->orderBy('order')->get()
        );
    }

    public function destroy(Section $section)
    {
        // Section case_study sengaja TIDAK BISA dihapus lewat endpoint generic
        // ini, apa pun statusnya (draft ataupun sudah ada attempt user) —
        // identitasnya (type+order=8, satu-satunya per year) dibuat immutable
        // setelah dibuat, sama seperti 'type' yang dikunci di update(). Kalau
        // isinya salah, admin edit lewat tab Studi Kasus, bukan hapus+buat ulang.
        if ($section->isCaseStudy()) {
            return response()->json([
                'message' => 'Section studi kasus tidak bisa dihapus. Edit isinya lewat tab Studi Kasus.',
            ], 403);
        }

        $section->delete();

        return response()->json(null, 204);
    }
}