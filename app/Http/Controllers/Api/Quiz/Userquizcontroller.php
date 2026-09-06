<?php

namespace App\Http\Controllers\Api\Quiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\Quiz\StoreQuizAttemptRequest;
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
        // menjawab (bukan alat tes) — is_correct baru diikutkan di feedback
        // submitAttempt() setelah kuis dikerjakan.
        return $quiz->load(['questions' => function ($q) {
            $q->select('id', 'quiz_id', 'order', 'question');
        }, 'questions.options:id,quiz_question_id,option_text,order']);
    }

    /**
     * POST /api/years/{year}/quiz/attempt
     * R-QUIZ-08: idempotent per user per quiz — request kedua tidak
     * membuat record baru maupun mengubah completed_at.
     * R-QUIZ-04: answers hanya riwayat, tidak ada grading di sini.
     *
     * Validasi format + relasi question/option (R-QUIZ-04) sudah dipindah
     * ke StoreQuizAttemptRequest — kalau lolos sampai sini, $request->answers
     * dijamin: tiap key soal memang milik quiz ini, tiap value opsi memang
     * milik soal tsb.
     */
    public function submitAttempt(StoreQuizAttemptRequest $request, Year $year)
    {
        $quiz = $year->quiz;

        if (! $quiz || ! $quiz->is_published) {
            throw new NotFoundHttpException();
        }

        $answers = $request->validated()['answers'] ?? [];

        $attempt = UserQuizAttempt::firstOrCreate(
            ['user_id' => $request->user()->id, 'quiz_id' => $quiz->id],
            ['answers' => $answers, 'completed_at' => now()]
        );

        // R-QUIZ-08 (idempotent): kalau attempt sudah ada sebelumnya,
        // firstOrCreate() TIDAK menimpa answers lama dengan $answers dari
        // request kedua ini — feedback selalu dihitung dari jawaban asli
        // yang tersimpan (attempt pertama), bukan dari body request saat ini.
        $storedAnswers = $attempt->answers ?? [];

        // R-QUIZ-04: feedback benar/salah per soal dihitung on-the-fly di sini
        // (bandingkan quiz_question_option_id yang dipilih vs is_correct opsi
        // tsb) — tidak disimpan sebagai kolom baru, tidak diagregasi jadi
        // skor/nilai akhir, dan tidak memengaruhi status attempt "selesai"
        // maupun "year completed" (R-PROG-07) yang sudah ditentukan di atas
        // begitu attempt tercatat.
        $questions = $quiz->questions()
            ->with('options:id,quiz_question_id,is_correct')
            ->get(['id', 'quiz_id', 'order', 'question', 'explanation_correct', 'explanation_incorrect']);

        $feedback = $questions->map(function ($question) use ($storedAnswers) {
            $selectedOptionId = $storedAnswers[$question->id] ?? null;
            $selectedOption = $selectedOptionId
                ? $question->options->firstWhere('id', (int) $selectedOptionId)
                : null;

            $isCorrect = (bool) ($selectedOption->is_correct ?? false);

            return [
                'question_id' => $question->id,
                'selected_option_id' => $selectedOptionId,
                'is_correct' => $isCorrect,
                // R-QUIZ-04 (revisi terbaru): explanation selalu dikirim,
                // tapi isinya beda kolom tergantung hasil jawaban — validasi
                // + apresiasi kalau benar, penjelasan jawaban benar kalau
                // salah. Lihat QuizQuestion::explanationFor().
                'explanation' => $question->explanationFor($isCorrect),
            ];
        })->values();

        // R-PROG-08: re-check status "year completed" setiap ada attempt baru.
        $newlyUnlocked = $this->yearCompletion->checkAndUnlockVaccines($request->user(), $year);

        return response()->json([
            'message' => $attempt->wasRecentlyCreated
                ? 'Kuis berhasil dikerjakan.'
                : 'Kuis ini sudah pernah dikerjakan sebelumnya.',
            'completed_at' => $attempt->completed_at,
            'feedback' => $feedback,
            'newly_unlocked_vaccine_ids' => $newlyUnlocked->values(),
        ]);
    }

    /**
     * POST /api/years/{year}/quiz/questions/{question}/answer
     * BARU — progressive save + feedback real-time per soal.
     *
     * Beda dari submitAttempt() lama (terima SEMUA jawaban sekaligus di
     * akhir): endpoint ini dipanggil SETIAP soal dijawab, langsung menyimpan
     * progresif ke user_quiz_attempts.answers (upsert per-key, bukan overwrite
     * total) dan mengembalikan feedback instan untuk soal ITU SAJA — termasuk
     * correct_option_id (BEDA dari submitAttempt() lama yang sengaja tidak
     * mengirim ini) supaya opsi yang benar bisa di-highlight saat user salah,
     * sesuai PRD.md QUIZ-03 / Rules.md R-QUIZ-04 ("opsi yang benar ikut
     * di-highlight" saat jawaban salah).
     *
     * completed_at BARU di-set begitu jawaban untuk SEMUA soal quiz ini sudah
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