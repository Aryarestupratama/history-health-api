<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\YearResource;
use App\Models\Era;
use App\Services\Progress\YearCompletionService;
use App\Services\Section\SectionAccessService;
use App\Services\YearSummary\YearSummaryService;

class YearController extends Controller
{
    public function __construct(
        private SectionAccessService $sectionAccessService,
        private YearCompletionService $yearCompletionService,
        private YearSummaryService $yearSummaryService,
    ) {
    }

    public function index(Era $era)
    {
        // Optional auth: route ini publik (guest boleh akses), tapi kalau
        // ada Bearer token valid, guard sanctum tetap bisa di-resolve
        // langsung tanpa middleware 'auth:sanctum' (yang mewajibkan login).
        // Dipakai untuk menentukan status locked/completed per user
        // (R-YEAR-02/03, R-SECT-01-04) — null berarti guest.
        $user = auth('sanctum')->user();

        // hanya tahun yang punya minimal 1 section published yang ditampilkan
        // (INFO-01: "hanya tahun yang punya data wabah yang ditampilkan")
        $years = $era->years()
            ->whereHas('sections', fn ($q) => $q->published())
            ->with([
                // (Baru — Fase 1 Studi Kasus) tambah `type` ke select() —
                // wajib, kalau tidak field ini null di response walau sudah
                // di-expose YearResource (kolom yang tidak ada di select()
                // Eloquent tidak ikut ter-load).
                'sections' => fn ($q) => $q->published()->select('id', 'title', 'type', 'order', 'year_id'),
                'quiz',
                // (Baru) dipakai bareng YearSummaryService::hasCompleted()
                // di bawah — sama alasan kenapa 'quiz' di-eager-load, biar
                // YearResource::whenLoaded('summary', ...) tidak N+1 query.
                'summary',
            ])
            ->orderBy('year') // kronologis, bukan urutan input admin
            ->get();

        $completedYearsCount = 0;

        $years->each(function ($year) use ($user, &$completedYearsCount) {
            // R-YEAR-02/03: status lock di level tahun (mendahului lock section).
            $year->setAttribute('locked', ! $this->sectionAccessService->isYearUnlocked($user, $year));

            // R-PROG-07: status "year completed" — selalu false untuk guest
            // (guest tidak punya user_progress/user_quiz_attempts sama sekali).
            $isCompleted = $user ? $this->yearCompletionService->isCompleted($user, $year) : false;
            $year->setAttribute('is_completed', $isCompleted);

            if ($isCompleted) {
                $completedYearsCount++;
            }

            // (Baru, SUM-05/06) Status rangkuman sudah diselesaikan user —
            // pakai relasi 'summary' yang sudah di-eager-load di atas
            // (BUKAN YearSummaryService::getPublishedForYear(), yang akan
            // query ulang & bikin N+1 di sini) — hanya dianggap "completed"
            // kalau rangkumannya memang published DAN user login (guest
            // tidak pernah punya completion tersimpan, R-SUM-13).
            $yearSummary = $year->summary;
            $yearSummaryCompleted = ($user && $yearSummary && $yearSummary->is_published)
                ? $this->yearSummaryService->hasCompleted($user, $yearSummary)
                : false;
            $year->setAttribute('year_summary_completed', $yearSummaryCompleted);

            // Sisipkan status locked/completed per section (Architecture.md §4.7).
            $sectionStatuses = $this->sectionAccessService->statusForYear($user, $year)
                ->keyBy(fn ($status) => $status['section']->id);

            $year->setRelation('sections', $year->sections->map(function ($section) use ($sectionStatuses) {
                $status = $sectionStatuses->get($section->id);
                $section->setAttribute('locked', $status['locked'] ?? true);
                $section->setAttribute('completed', $status['completed'] ?? false);

                return $section;
            }));
        });

        // Meta progress era ("5 dari 12 tahun dibaca") — dihitung on-the-fly,
        // sama filosofinya dengan derived logic lain di Schema.md §4.
        return YearResource::collection($years)->additional([
            'meta' => [
                'completed_years' => $completedYearsCount,
                'total_years' => $years->count(),
            ],
        ]);
    }
}