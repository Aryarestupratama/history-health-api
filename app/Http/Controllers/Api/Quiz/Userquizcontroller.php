<?php

namespace App\Http\Controllers\Api\Quiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\Quiz\StoreQuizAnswerRequest;
use App\Models\UserQuizAttempt;
use App\Models\QuizQuestion;
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

        // R-QUIZ-04: tidak ada kunci jawaban yang dikirim ke user sebelum
        // menjawab (bukan alat tes) — is_correct/correct_option_id baru
        // diikutkan di feedback answerQuestion() setelah soal dijawab.
        return $quiz->load(['questions' => function ($q) {
            $q->select('id', 'quiz_id', 'order', 'question');
        }, 'questions.options:id,quiz_question_id,option_text,order']);
    }

    /**
     * POST /api/years/{year}/quiz/questions/{question}/answer
     * Progressive save + feedback real-time per soal.
     *
     * Dipanggil SETIAP soal dijawab, langsung menyimpan progresif ke
     * user_quiz_attempts.answers (upsert per-key, bukan overwrite total)
     * dan mengembalikan feedback instan untuk soal ITU SAJA — termasuk
     * correct_option_id supaya opsi yang benar bisa di-highlight saat user
     * salah, sesuai PRD.md QUIZ-03 / Rules.md R-QUIZ-04 ("opsi yang benar
     * ikut di-highlight" saat jawaban salah).
     *
     * completed_at di-set begitu jawaban untuk SEMUA soal quiz ini sudah
     * terkumpul (bukan saat endpoint ini pertama kali dipanggil) — baru di
     * titik itu status "year completed" (R-PROG-07/08) & unlock vaksin
     * dicek ulang.
     *
     * R-QUIZ-08 (idempotent) tetap terjaga: kalau attempt SUDAH punya
     * completed_at (semua soal sudah pernah dituntaskan), request baru ke
     * endpoint ini ditolak 409 — jawaban yang sudah final tidak boleh diubah.
     */
    public function answerQuestion(StoreQuizAnswerRequest $request, Year $year, QuizQuestion $question)
    {
        $quiz = $year->quiz;

        if (! $quiz || ! $quiz->is_published || $question->quiz_id !== $quiz->id) {
            throw new NotFoundHttpException();
        }

        // R-QUIZ-02: sama seperti show(), harus sudah selesai semua section.
        $publishedSections = $year->sections()->published()->get();
        $completedCount = $request->user()->progress()
            ->whereIn('section_id', $publishedSections->pluck('id'))
            ->count();

        if ($completedCount < $publishedSections->count()) {
            return response()->json([
                'message' => 'Selesaikan seluruh section pada tahun ini terlebih dahulu sebelum mengerjakan kuis.',
            ], 403);
        }

        $attempt = UserQuizAttempt::firstOrCreate(
            ['user_id' => $request->user()->id, 'quiz_id' => $quiz->id],
            ['answers' => [], 'completed_at' => null]
        );

        if ($attempt->completed_at !== null) {
            return response()->json([
                'message' => 'Kuis ini sudah selesai dikerjakan sebelumnya.',
            ], 409);
        }

        $optionId = (int) $request->validated()['option_id'];

        // Upsert progresif — gabung ke jawaban yang sudah ada, bukan overwrite total.
        $answers = $attempt->answers ?? [];
        $answers[$question->id] = $optionId;
        $attempt->answers = $answers;

        $allQuestionIds = $quiz->questions()->pluck('id');
        $answeredQuestionIds = collect(array_keys($answers))->map(fn ($id) => (int) $id);
        $isNowComplete = $allQuestionIds->diff($answeredQuestionIds)->isEmpty();

        if ($isNowComplete) {
            $attempt->completed_at = now();
        }

        $attempt->save();

        $newlyUnlocked = collect();
        if ($isNowComplete) {
            // R-PROG-08: re-check status "year completed" begitu quiz selesai.
            $newlyUnlocked = $this->yearCompletion->checkAndUnlockVaccines($request->user(), $year);
        }

        $question->loadMissing('options:id,quiz_question_id,option_text,is_correct,order');
        $selectedOption = $question->options->firstWhere('id', $optionId);
        $correctOption = $question->options->firstWhere('is_correct', true);
        $isCorrect = (bool) ($selectedOption->is_correct ?? false);

        return response()->json([
            'question_id' => $question->id,
            'selected_option_id' => $optionId,
            'correct_option_id' => $correctOption?->id,
            'is_correct' => $isCorrect,
            'explanation' => $question->explanationFor($isCorrect),
            'quiz_completed' => $isNowComplete,
            'newly_unlocked_vaccine_ids' => $newlyUnlocked->values(),
        ]);
    }
}