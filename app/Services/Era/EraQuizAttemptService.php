<?php

namespace App\Services\Era;

use App\Models\EraQuiz;
use App\Models\QuizQuestion;
use App\Models\User;
use App\Models\UserEraQuizAttempt;

/**
 * REVISI BESAR: kuis sumatif era tidak lagi punya bank soal sendiri —
 * semua method di sini sekarang bekerja dengan QuizQuestion (bank
 * formatif per year), bukan EraQuizQuestion (dihapus total).
 */
class EraQuizAttemptService
{
    /**
     * R-ERAQUIZ-11: dipanggil saat user MEMULAI kuis sumatif — mengambil
     * EraQuiz::ATTEMPT_QUESTION_COUNT (20) soal, didistribusikan
     * proporsional per year dalam era ini (EraQuiz::randomQuestions()),
     * dari bank soal FORMATIF (quiz_questions) milik tiap year.
     */
    public function questionsForAttempt(EraQuiz $eraQuiz)
    {
        return $eraQuiz->randomQuestions();
    }

    /**
     * R-ERAQUIZ-04/08: submit sekali di akhir, boleh retake (overwrite).
     * $answers: object map { "<quiz_question_id>": <quiz_question_option_id>, ... },
     * MERUJUK KE BANK FORMATIF (bukan bank era sendiri lagi).
     *
     * @param  array<int|string, int>  $answers
     */
    public function submit(User $user, EraQuiz $eraQuiz, array $answers): UserEraQuizAttempt
    {
        return UserEraQuizAttempt::recordAttempt($user->id, $eraQuiz->id, $answers);
    }

    /**
     * Ringkasan skor untuk halaman Hasil: total benar/salah + persentase +
     * status lulus/tidak lulus. Dihitung HANYA dari soal yang ada di
     * `answers` attempt (20 soal hasil randomize saat attempt dimulai),
     * di-query ke QuizQuestion (bank formatif), bukan EraQuizQuestion lagi.
     *
     * @return array{total: int, correct: int, incorrect: int, percentage: int, is_passing: bool}
     */
    public function buildResult(UserEraQuizAttempt $attempt): array
    {
        $answers = $attempt->answers ?? [];
        $questionIds = array_map('intval', array_keys($answers));

        $questions = QuizQuestion::whereIn('id', $questionIds)->with('options')->get();

        $total = $questions->count();
        $correct = $questions->filter(function ($question) use ($answers) {
            $selectedOptionId = $answers[$question->id] ?? null;

            if ($selectedOptionId === null) {
                return false;
            }

            $selectedOption = $question->options->firstWhere('id', (int) $selectedOptionId);

            return (bool) $selectedOption?->is_correct;
        })->count();

        $percentage = $total > 0 ? (int) round(($correct / $total) * 100) : 0;

        return [
            'total' => $total,
            'correct' => $correct,
            'incorrect' => $total - $correct,
            'percentage' => $percentage,
            'is_passing' => $percentage >= EraQuiz::PASSING_GRADE_PERCENTAGE,
        ];
    }

    /**
     * Rekap penuh untuk halaman "Lihat Rekapan": HANYA soal yang ada di
     * `answers` attempt, di-query ke QuizQuestion (bank formatif) —
     * masing-masing dengan opsi yang dipilih user, status benar/salah,
     * opsi yang benar (highlight hijau), dan explanation yang sesuai
     * (explanationFor(), method yang sama persis dengan QuizQuestion milik
     * kuis formatif — tidak ada duplikasi logic lagi).
     *
     * @return \Illuminate\Support\Collection
     */
    public function buildRecap(UserEraQuizAttempt $attempt): \Illuminate\Support\Collection
    {
        $answers = $attempt->answers ?? [];
        $questionIds = array_map('intval', array_keys($answers));

        $questions = QuizQuestion::whereIn('id', $questionIds)->with('options', 'quiz.year')->get();

        return $questions->map(function ($question) use ($answers) {
            $selectedOptionId = $answers[$question->id] ?? null;
            $selectedOption = $selectedOptionId !== null
                ? $question->options->firstWhere('id', (int) $selectedOptionId)
                : null;
            $correctOption = $question->options->firstWhere('is_correct', true);
            $isCorrect = (bool) $selectedOption?->is_correct;

            return [
                'question' => $question,
                // Info tambahan (baru): tahun asal soal ini — berguna kalau
                // Flutter mau menampilkan label "dari tahun 1974" di rekap,
                // opsional dipakai atau tidak.
                'year' => $question->quiz->year,
                'selected_option_id' => $selectedOption?->id,
                'correct_option_id' => $correctOption?->id,
                'is_correct' => $isCorrect,
                'explanation' => $question->explanationFor($isCorrect),
            ];
        });
    }
}