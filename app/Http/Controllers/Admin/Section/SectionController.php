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

        $section = DB::transaction(function () use ($data) {
            // lockForUpdate() mencegah 2 request store() bersamaan
            // membaca max('order') yang sama lalu insert dengan order yang sama
            $maxOrder = Section::where('year_id', $data['year_id'])
                ->lockForUpdate()
                ->max('order');

            $data['order'] ??= ($maxOrder === null ? 1 : $maxOrder + 1);

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
        $data = $request->validated();
        unset($data['order']);

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

        DB::transaction(function () use ($ids, $yearId) {
            // Step 1: geser semua order ke angka besar dulu (hindari collision
            // dengan unique constraint saat swap di tengah proses)
            Section::where('year_id', $yearId)
                ->whereIn('id', $ids)
                ->update(['order' => DB::raw('`order` + 100000')]);

            // Step 2: assign order final sesuai urutan yang dikirim dari frontend
            foreach ($ids as $index => $sectionId) {
                Section::where('id', $sectionId)
                    ->where('year_id', $yearId) // guard: section harus milik year ini
                    ->update(['order' => $index + 1]);
            }
        });

        return response()->json(
            Section::where('year_id', $yearId)->orderBy('order')->get()
        );
    }

    public function destroy(Section $section)
    {
        $section->delete();

        return response()->json(null, 204);
    }
}