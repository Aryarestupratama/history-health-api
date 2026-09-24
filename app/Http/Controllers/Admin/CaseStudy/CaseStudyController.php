<?php

namespace App\Http\Controllers\Admin\CaseStudy;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CaseStudy\UpdateCaseStudyContentRequest;
use App\Http\Requests\Admin\CaseStudy\UpdateCaseStudyOptionsRequest;
use App\Models\CaseStudy;
use App\Models\Section;
use App\Services\CaseStudy\CaseStudyService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CaseStudyController extends Controller
{
    public function __construct(private CaseStudyService $service)
    {
    }

    /**
     * GET /admin/sections/{section}/case-study
     * Ambil (atau buat draft baru) studi kasus milik section ber-type
     * `case_study` — sama pola dengan YearSummaryController::show(): 1
     * studi kasus per section (unique section_id), skeleton 5 opsi
     * di-generate otomatis kalau belum ada (R-CASE, progress.md).
     *
     * 404 kalau section bukan bertipe case_study — bukan section bacaan
     * biasa yang salah dipanggil ke endpoint ini.
     */
    public function show(Section $section)
    {
        if (! $section->isCaseStudy()) {
            throw new NotFoundHttpException();
        }

        $caseStudy = CaseStudy::firstOrCreate(
            ['section_id' => $section->id],
            ['is_published' => false]
        );

        $this->service->ensureSkeleton($caseStudy);

        return $caseStudy->load('options');
    }

    /**
     * PATCH /admin/case-studies/{caseStudy}
     * Update konten teks (Briefing, deskripsi alasan, kedua feedback,
     * Badge) — semua field nullable di request, wajib terisi baru dicek
     * di publish() (CaseStudy::canPublish()).
     */
    public function updateContent(UpdateCaseStudyContentRequest $request, CaseStudy $caseStudy)
    {
        $caseStudy->update($request->validated());

        return $caseStudy->load('options');
    }

    /**
     * PATCH /admin/case-studies/{caseStudy}/options
     * Update in-place ke 5 opsi yang sudah ada (BUKAN delete+recreate —
     * lihat catatan class-level CaseStudyService kenapa).
     */
    public function updateOptions(UpdateCaseStudyOptionsRequest $request, CaseStudy $caseStudy)
    {
        $this->service->updateOptions($caseStudy, $request->validated()['options']);

        return $caseStudy->load('options');
    }

    /**
     * PATCH /admin/case-studies/{caseStudy}/publish
     * CaseStudy::canPublish(): tepat 5 opsi (rank 1/2/3 masing-masing
     * tepat satu), dan seluruh kolom teks wajib (kecuali badge_description)
     * sudah terisi.
     *
     * (Fix) Section induk (type=case_study) ikut disinkronkan is_published-nya
     * di sini — SectionAccessService::isUnlocked() menggerbangi akses lewat
     * `Section.is_published`, bukan `CaseStudy.is_published`. Karena section
     * case_study sengaja tidak muncul di tab "Section & Blok" (tidak punya
     * tombol Publish/Unpublish sendiri di sana — lihat WabahWorkspace.jsx),
     * tombol Publish di tab "Studi Kasus" ini adalah SATU-SATUNYA cara admin
     * menyalakan Section.is_published untuk section 8. Tanpa sinkronisasi
     * ini, section case_study tidak akan pernah unlocked ke user walau
     * CaseStudy-nya sendiri published (bug — section is_published diam di
     * false selamanya sejak dibuat via store(), R-ADMIN-03).
     */
    public function publish(Request $request, CaseStudy $caseStudy)
    {
        $wantsPublish = (bool) $request->boolean('is_published');

        if ($wantsPublish && ! $caseStudy->canPublish()) {
            return response()->json([
                'message' => 'Studi Kasus belum bisa dipublish. Pastikan seluruh teks (briefing, deskripsi alasan, kedua feedback, nama & ikon badge) terisi, dan 5 opsi sudah punya prioritas 1/2/3 (masing-masing satu) + 2 pengecoh.',
            ], 422);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($caseStudy, $wantsPublish) {
            $caseStudy->update(['is_published' => $wantsPublish]);
            $caseStudy->section()->update(['is_published' => $wantsPublish]);
        });

        return $caseStudy->load('options');
    }
}