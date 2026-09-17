<?php

namespace App\Http\Controllers\Api\YearSummary;

use App\Http\Controllers\Controller;
use App\Http\Requests\YearSummary\StoreYearSummaryAnswerRequest;
use App\Http\Requests\YearSummary\StoreYearSummaryAttemptRequest;
use App\Models\Year;
use App\Models\YearSummaryPoint;
use App\Services\Progress\YearCompletionService;
use App\Services\YearSummary\YearSummaryService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class UserYearSummaryController extends Controller
{
    public function __construct(
        private YearSummaryService $service,
        private YearCompletionService $yearCompletion,
    ) {
    }

    /**
     * GET /api/years/{year}/summary
     * INFO-04: hanya bisa diambil jika seluruh section published di year
     * tsb sudah completed oleh user — SAMA gate dengan
     * UserQuizController::show() (sengaja inline, bukan lewat
     * YearCompletionService, sama pola dengan controller kuis existing).
     *
     * Response:
     * - completion: null kalau belum pernah diselesaikan, atau
     *   {is_perfect, completed_at} kalau sudah (SUM-05 — dipakai Flutter
     *   buat nampilin pilihan "Lihat Rangkuman"/"Kerjakan Ulang").
     * - full_summary: 7 kalimat benar (SUM-03), hanya ada kalau completion
     *   tidak null.
     * - points: 7 poin + opsi teracak, TANPA is_correct (R-SUM-05) — selalu
     *   dikirim (dipakai baik pengerjaan pertama maupun "Kerjakan Ulang").
     */
    public function show(Request $request, Year $year)
    {
        $yearSummary = $this->service->getPublishedForYear($year);

        if (! $yearSummary) {
            throw new NotFoundHttpException();
        }

        if (! $this->allSectionsCompleted($request, $year)) {
            return response()->json([
                'message' => 'Selesaikan seluruh section pada tahun ini terlebih dahulu sebelum mengerjakan rangkuman.',
            ], 403);
        }

        $completion = $this->service->getCompletion($request->user(), $yearSummary);

        return response()->json([
            'completion' => $completion ? [
                'is_perfect' => $completion->is_perfect,
                'completed_at' => $completion->completed_at,
            ] : null,
            'full_summary' => $completion ? $this->service->getFullSummaryText($yearSummary) : null,
            'points' => $this->service->getPointsForAttempt($yearSummary)->values(),
        ]);
    }

    /**
     * POST /api/years/{year}/summary/points/{point}/answer
     * SUM-02: feedback instan per poin, TIDAK disimpan ke database sama
     * sekali (murni dihitung on-the-fly) — lihat
     * YearSummaryService::checkAnswer(). Sama gate section-completed
     * dengan show().
     */
    public function checkAnswer(StoreYearSummaryAnswerRequest $request, Year $year, YearSummaryPoint $point)
    {
        $yearSummary = $this->service->getPublishedForYear($year);

        if (! $yearSummary || $point->year_summary_id !== $yearSummary->id) {
            throw new NotFoundHttpException();
        }

        if (! $this->allSectionsCompleted($request, $year)) {
            return response()->json([
                'message' => 'Selesaikan seluruh section pada tahun ini terlebih dahulu sebelum mengerjakan rangkuman.',
            ], 403);
        }

        $result = $this->service->checkAnswer($point, (int) $request->validated()['option_id']);

        return response()->json([
            'point_id' => $point->id,
            'is_correct' => $result['is_correct'],
            'correct_option' => $result['correct_option'],
        ]);
    }

    /**
     * POST /api/years/{year}/summary/complete
     * SUM-05/R-SUM-11: dipanggil setelah poin ke-7 dijawab — baik
     * pengerjaan pertama maupun "Kerjakan Ulang" (body sama, service yang
     * menentukan overwrite). Server menghitung ulang is_perfect dari DB
     * (bukan percaya client, lihat YearSummaryService::submitAttempt()).
     *
     * quiz_unlocked selalu true di response ini — begitu endpoint ini
     * sukses dipanggil, SUM-06 otomatis terpenuhi (gate section-completed
     * sudah lolos duluan untuk sampai ke sini) — dikembalikan eksplisit
     * lewat YearCompletionService::isQuizUnlocked() supaya Flutter tidak
     * perlu hardcode asumsi ini sendiri kalau logic-nya berubah nanti.
     */
    public function submit(StoreYearSummaryAttemptRequest $request, Year $year)
    {
        $yearSummary = $this->service->getPublishedForYear($year);

        if (! $yearSummary) {
            throw new NotFoundHttpException();
        }

        if (! $this->allSectionsCompleted($request, $year)) {
            return response()->json([
                'message' => 'Selesaikan seluruh section pada tahun ini terlebih dahulu sebelum mengerjakan rangkuman.',
            ], 403);
        }

        $completion = $this->service->submitAttempt(
            $request->user(),
            $yearSummary,
            $request->validated()['answers']
        );

        return response()->json([
            'is_perfect' => $completion->is_perfect,
            'completed_at' => $completion->completed_at,
            'full_summary' => $this->service->getFullSummaryText($yearSummary),
            'quiz_unlocked' => $this->yearCompletion->isQuizUnlocked($request->user(), $year),
        ]);
    }

    private function allSectionsCompleted(Request $request, Year $year): bool
    {
        $publishedSections = $year->sections()->published()->get();
        $completedCount = $request->user()->progress()
            ->whereIn('section_id', $publishedSections->pluck('id'))
            ->count();

        return $completedCount >= $publishedSections->count() && $publishedSections->isNotEmpty();
    }
}