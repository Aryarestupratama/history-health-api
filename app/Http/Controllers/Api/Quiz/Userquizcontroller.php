<?php

namespace App\Http\Controllers\Api\Quiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\Quiz\StoreQuizAnswerRequest;
use App\Models\Quiz;
use App\Models\QuizQuestion;
use App\Models\Year;
use App\Services\Progress\YearCompletionService;
use App\Services\Quiz\QuizAttemptService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class UserQuizController extends Controller
{
    public function __construct(
        private YearCompletionService $yearCompletion,
        private QuizAttemptService $attempts,
    ) {
    }

    /**
     * GET /api/years/{year}/quiz
     * R-QUIZ-02: hanya bisa diambil jika seluruh section published di year
     * tsb sudah completed oleh user. R-QUIZ-09: guest tidak bisa akses sama
     * sekali — endpoint ini ada di grup middleware auth:sanctum + verified.
     *
     * R-QUIZ-11 (baru): response sekarang menyertakan `passing_grade` (75)
     * & `question_count` (Quiz::QUESTION_COUNT, 10) supaya Flutter bisa
     * tampilkan layar info "Nilai minimum kelulusan: 75%" SEBELUM user
     * masuk ke soal pertama — ditampilkan di layar ini, bukan endpoint
     * terpisah, supaya Flutter cukup 1x call sebelum render layar mulai.
     * Ikut disertakan status attempt terkini (`attempt_status`,
     * `latest_score`) supaya Flutter tahu harus render "Mulai Kuis",
     * "Lanjutkan", atau "Kerjakan Ulang (belum lulus)".
     */
    public function show(Request $request, Year $year)
    {
        $quiz = $year->quiz;

        if (! $quiz || ! $quiz->is_published) {
            throw new NotFoundHttpException();
        }

        if (! $this->sectionsCompleted($request, $year)) {
            return response()->json([
                'message' => 'Selesaikan seluruh section pada tahun ini terlebih dahulu sebelum mengerjakan kuis.',
            ], 403);
        }

        $latestAttempt = $this->yearCompletion->latestQuizAttempt($request->user(), $year);

        // R-QUIZ-04: tidak ada kunci jawaban yang dikirim ke user sebelum
        // menjawab (bukan alat tes) — is_correct/correct_option_id baru
        // diikutkan di feedback answerQuestion() setelah soal dijawab.
        $quiz->load(['questions' => function ($q) {
            $q->select('id', 'quiz_id', 'order', 'question');
        }, 'questions.options:id,quiz_question_id,option_text,order']);

        return response()->json([
            'quiz' => $quiz,
            'passing_grade' => Quiz::PASSING_GRADE_PERCENTAGE,
            'question_count' => Quiz::QUESTION_COUNT,
            'attempt_status' => $this->attemptStatus($latestAttempt),
            'latest_score' => $latestAttempt?->scorePercentage(),
        ]);
    }

    /**
     * POST /api/years/{year}/quiz/retry
     * R-QUIZ-08 (baru): dipanggil user untuk mengerjakan ulang kuis yang
     * belum lulus (skor < passing grade). Ditolak 422 kalau attempt sudah
     * lulus (tidak ada gunanya retry kuis yang sudah lulus) atau kalau
     * belum pernah ada attempt sama sekali (belum perlu retry, langsung
     * jawab soal pertama saja lewat answerQuestion()).
     */
    public function retry(Request $request, Year $year)
    {
        $quiz = $year->quiz;

        if (! $quiz || ! $quiz->is_published) {
            throw new NotFoundHttpException();
        }

        try {
            $attempt = $this->attempts->retry($request->user(), $quiz);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Kuis siap dikerjakan ulang.',
            'attempt_status' => $this->attemptStatus($attempt),
        ]);
    }

    /**
     * POST /api/years/{year}/quiz/questions/{question}/answer
     * Progressive save + feedback real-time per soal (TIDAK berubah dari
     * versi lama — feedback instan tetap dipertahankan sesuai keputusan
     * "abis jawab langsung dinilai").
     *
     * BEDA dari versi lama: begitu SEMUA soal terjawab (`quiz_completed:
     * true`), response sekarang MENYERTAKAN skor akhir + status
     * lulus/tidak lulus (`final_score`, `is_passing`) — dihitung dari
     * `UserQuizAttempt::scorePercentage()`/`isPassing()`. Kalau lulus,
     * `YearCompletionService::checkAndUnlockVaccines()` akan unlock vaksin
     * terkait (isCompleted() di baliknya sekarang juga mengecek isPassing());
     * kalau gagal, TIDAK ada unlock, dan user perlu panggil retry() untuk
     * mengerjakan ulang.
     *
     * R-QUIZ-08 (revisi): attempt yang sudah completed_at (baik lulus
     * maupun gagal) mengunci endpoint ini — 409, sampai user memanggil
     * retry() secara eksplisit. Beda dari versi lama yang mengunci
     * permanen tanpa jalan keluar.
     */
    public function answerQuestion(StoreQuizAnswerRequest $request, Year $year, QuizQuestion $question)
    {
        $quiz = $year->quiz;

        if (! $quiz || ! $quiz->is_published || $question->quiz_id !== $quiz->id) {
            throw new NotFoundHttpException();
        }

        if (! $this->sectionsCompleted($request, $year)) {
            return response()->json([
                'message' => 'Selesaikan seluruh section pada tahun ini terlebih dahulu sebelum mengerjakan kuis.',
            ], 403);
        }

        $attempt = $this->attempts->getOrCreateAttempt($request->user(), $quiz);

        if (! $this->attempts->canAnswer($attempt)) {
            return response()->json([
                'message' => 'Kuis ini sudah selesai dikerjakan. Kerjakan ulang lewat endpoint retry jika belum lulus.',
            ], 409);
        }

        $optionId = (int) $request->validated()['option_id'];
        ['is_complete' => $isNowComplete] = $this->attempts->recordAnswer($attempt, $quiz, $question, $optionId);

        $newlyUnlocked = collect();
        $finalScore = null;
        $isPassing = null;

        if ($isNowComplete) {
            $finalScore = $attempt->scorePercentage();
            $isPassing = $attempt->isPassing();

            // R-PROG-08: re-check status "year completed" begitu quiz selesai
            // — isCompleted() di baliknya sekarang juga mensyaratkan isPassing().
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
            'final_score' => $finalScore,
            'is_passing' => $isPassing,
            'passing_grade' => Quiz::PASSING_GRADE_PERCENTAGE,
            'newly_unlocked_vaccine_ids' => $newlyUnlocked->values(),
        ]);
    }

    private function sectionsCompleted(Request $request, Year $year): bool
    {
        $publishedSections = $year->sections()->published()->get();
        $completedCount = $request->user()->progress()
            ->whereIn('section_id', $publishedSections->pluck('id'))
            ->count();

        return $completedCount >= $publishedSections->count();
    }

    /**
     * 'not_started' | 'in_progress' | 'failed' | 'passed'
     */
    private function attemptStatus(?\App\Models\UserQuizAttempt $attempt): string
    {
        if (! $attempt) {
            return 'not_started';
        }

        if ($attempt->completed_at === null) {
            return 'in_progress';
        }

        return $attempt->isPassing() ? 'passed' : 'failed';
    }
}