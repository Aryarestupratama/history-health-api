<?php

namespace App\Http\Controllers\Api\Quiz;

use App\Http\Controllers\Controller;
use App\Models\UserQuizAttempt;
use App\Models\Year;
use App\Services\Progress\YearCompletionService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class UserQuizController extends Controller
{
    public function __construct(private YearCompletionService $yearCompletion)
    {
    }

    /**
     * GET /api/years/{year}/quiz
     * R-QUIZ-02: hanya bisa diambil jika seluruh section published di year
     * tsb sudah completed oleh user. R-QUIZ-09: guest tidak bisa akses sama
     * sekali — endpoint ini ada di grup middleware auth:sanctum + verified.
     */
    public function show(Request $request, Year $year)
    {
        $quiz = $year->quiz;

        if (! $quiz || ! $quiz->is_published) {
            throw new NotFoundHttpException();
        }

        $publishedSections = $year->sections()->published()->get();
        $completedCount = $request->user()->progress()
            ->whereIn('section_id', $publishedSections->pluck('id'))
            ->count();

        if ($completedCount < $publishedSections->count()) {
            return response()->json([
                'message' => 'Selesaikan seluruh section pada tahun ini terlebih dahulu sebelum mengerjakan kuis.',
            ], 403);
        }

        // R-QUIZ-04: tidak ada kunci jawaban yang dikirim ke user (bukan alat tes).
        return $quiz->load(['questions' => function ($q) {
            $q->select('id', 'quiz_id', 'order', 'question', 'type');
        }, 'questions.options:id,quiz_question_id,option_text,order']);
    }

    /**
     * POST /api/years/{year}/quiz/attempt
     * R-QUIZ-08: idempotent per user per quiz — request kedua tidak
     * membuat record baru maupun mengubah completed_at.
     * R-QUIZ-04: answers hanya riwayat, tidak ada grading di sini.
     */
    public function submitAttempt(Request $request, Year $year)
    {
        $quiz = $year->quiz;

        if (! $quiz || ! $quiz->is_published) {
            throw new NotFoundHttpException();
        }

        $data = $request->validate([
            'answers' => 'nullable|array',
        ]);

        $attempt = UserQuizAttempt::firstOrCreate(
            ['user_id' => $request->user()->id, 'quiz_id' => $quiz->id],
            ['answers' => $data['answers'] ?? null, 'completed_at' => now()]
        );

        // R-PROG-08: re-check status "year completed" setiap ada attempt baru.
        $newlyUnlocked = $this->yearCompletion->checkAndUnlockVaccines($request->user(), $year);

        return response()->json([
            'message' => $attempt->wasRecentlyCreated
                ? 'Kuis berhasil dikerjakan.'
                : 'Kuis ini sudah pernah dikerjakan sebelumnya.',
            'completed_at' => $attempt->completed_at,
            'newly_unlocked_vaccine_ids' => $newlyUnlocked->values(),
        ]);
    }
}