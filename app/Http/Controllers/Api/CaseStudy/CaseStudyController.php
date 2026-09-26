<?php

namespace App\Http\Controllers\Api\CaseStudy;

use App\Http\Controllers\Controller;
use App\Http\Requests\CaseStudy\StoreCaseStudySubmitRequest;
use App\Models\Section;
use App\Services\CaseStudy\CaseStudyService;
use App\Services\Section\SectionAccessService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CaseStudyController extends Controller
{
    public function __construct(
        private CaseStudyService $service,
        private SectionAccessService $sectionAccess,
    ) {
    }

    /**
     * GET /api/sections/{section}/case-study
     * Gate akses studi kasus SAMA dengan section manapun — dicek eksplisit
     * di sini (bukan middleware) lewat SectionAccessService::isUnlocked(),
     * sama pola dengan UserYearSummaryController yang cek gate-nya sendiri
     * (bukan asumsi sudah dicek di layer lain). Sequential unlock section
     * (R-SECT-01/02, R-YEAR-04) yang menentukan section 8 baru bisa diakses
     * setelah section 7 completed — TIDAK ADA gate tambahan khusus studi
     * kasus di luar itu.
     *
     * Response TIDAK PERNAH menyertakan correct_rank opsi (lihat
     * CaseStudyService::getOptionsForAttempt()).
     *
     * `completed`/`completed_at`: dikirim apa adanya, Flutter yang
     * menentukan alur layar (Opening vs langsung Badge vs tawaran "Kerjakan
     * Ulang") — perilaku pasti saat dibuka ulang yang sudah selesai masih
     * OPEN DECISION di progress.md ("Detail yang masih terbuka"), backend
     * sengaja hanya expose state mentahnya di sini, bukan menentukan alur.
     */
    public function show(Request $request, Section $section)
    {
        if (! $section->isCaseStudy()) {
            throw new NotFoundHttpException();
        }

        $caseStudy = $this->service->getPublishedForSection($section);

        if (! $caseStudy) {
            throw new NotFoundHttpException();
        }

        if (! $this->sectionAccess->isUnlocked($request->user(), $section)) {
            return response()->json([
                'message' => 'Selesaikan section sebelumnya terlebih dahulu sebelum membuka studi kasus ini.',
            ], 403);
        }

        $attempt = $this->service->getAttempt($request->user(), $caseStudy);
        $isCompleted = $attempt?->isCompleted() ?? false;

        $response = [
            'case_study' => [
                'id' => $caseStudy->id,
                'title' => $caseStudy->title,
                'description' => $caseStudy->description,
                'challenge_text' => $caseStudy->challenge_text,
                'reason_description' => $caseStudy->reason_description,
            ],
            'options' => $this->service->getOptionsForAttempt($caseStudy),
            'completed' => $isCompleted,
            'completed_at' => $attempt?->completed_at,
        ];

        // Mengaktifkan "opsi B" (langsung ke layar Badge, bukan Opening,
        // saat studi kasus yang sudah completed dibuka ulang) —
        // CaseStudyShellScreen._initStageFrom() di Flutter sudah siap
        // menerima field ini sejak Fase 1, hanya menunggu backend mengisinya
        // (lihat progress.md, "Dependensi backend yang masih menyusul").
        // Dikirim HANYA saat completed, sama seperti pola field `badge` di
        // submit().
        if ($isCompleted) {
            $response['badge'] = [
                'name' => $caseStudy->badge_name,
                'description' => $caseStudy->badge_description,
                'image_url' => $caseStudy->badge_image_url,
            ];
        }

        return response()->json($response);
    }

    /**
     * POST /api/sections/{section}/case-study/submit
     * Evaluasi hard-order di server (CaseStudyService::submit()) — TIDAK
     * ADA endpoint "evaluasi urutan" terpisah, feedback baru muncul di
     * sini setelah Submit. Kalau benar, section otomatis ditandai
     * completed (gate section 9 + year completed) lewat
     * CaseStudyService::completeSectionIfNeeded() — TIDAK lewat
     * `POST /sections/{section}/complete` biasa (yang menolak section
     * case_study, lihat ProgressController).
     *
     * Response HANYA menyertakan field badge (nama/deskripsi/ikon) kalau
     * is_correct true — sesuai alur 4 layar (Layar 4/Badge cuma muncul
     * kalau benar).
     */
    public function submit(StoreCaseStudySubmitRequest $request, Section $section)
    {
        if (! $section->isCaseStudy()) {
            throw new NotFoundHttpException();
        }

        $caseStudy = $this->service->getPublishedForSection($section);

        if (! $caseStudy) {
            throw new NotFoundHttpException();
        }

        if (! $this->sectionAccess->isUnlocked($request->user(), $section)) {
            return response()->json([
                'message' => 'Selesaikan section sebelumnya terlebih dahulu sebelum membuka studi kasus ini.',
            ], 403);
        }

        $result = $this->service->submit(
            $request->user(),
            $caseStudy,
            $request->slotOptionIds(),
            $request->validated('reason'),
        );

        $response = [
            'is_correct' => $result['is_correct'],
            'feedback' => $result['feedback'],
        ];

        if ($result['is_correct']) {
            $completion = $this->service->completeSectionIfNeeded($request->user(), $caseStudy);

            $response['badge'] = [
                'name' => $caseStudy->badge_name,
                'description' => $caseStudy->badge_description,
                'image_url' => $caseStudy->badge_image_url,
            ];
            $response['year_completed'] = $completion['year_completed'];
            $response['newly_unlocked_vaccine_ids'] = $completion['newly_unlocked_vaccines']->values();
            // (Fase 3) true HANYA di attempt yang benar-benar men-trigger
            // unlock (BorderUnlockService::checkAndUnlock() sticky) —
            // dipakai Flutter untuk munculkan notifikasi "Border SEKALA
            // terbuka!" tepat sekali, bukan tiap kali studi kasus lain yang
            // sudah pernah unlock border diselesaikan ulang.
            $response['border_unlocked'] = $completion['border_unlocked'];
            // Beda dari border_unlocked (sticky lintas-wabah): ini true
            // HANYA pada attempt yang PERTAMA KALI membuat progress section
            // studi kasus ini (lihat UserProgress::wasRecentlyCreated di
            // CaseStudyService::completeSectionIfNeeded()) — dipakai
            // Flutter untuk munculkan notifikasi "Badge X berhasil
            // didapat!" sekali saja, bukan tiap kali user retake studi
            // kasus yang sama dan tetap benar.
            $response['badge_newly_unlocked'] = $completion['badge_newly_unlocked'];
        }

        return response()->json($response);
    }
}