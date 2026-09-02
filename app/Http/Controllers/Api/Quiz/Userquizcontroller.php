<?php

namespace App\Http\Controllers\Api\Quiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\Quiz\StoreQuizAttemptRequest;
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
        $questions = $quiz->questions()->with('options:id,quiz_question_id,is_correct')->get();

        $feedback = $questions->map(function ($question) use ($storedAnswers) {
            $selectedOptionId = $storedAnswers[$question->id] ?? null;
            $selectedOption = $selectedOptionId
                ? $question->options->firstWhere('id', (int) $selectedOptionId)
                : null;

            return [
                'question_id' => $question->id,
                'selected_option_id' => $selectedOptionId,
                'is_correct' => (bool) ($selectedOption->is_correct ?? false),
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
}