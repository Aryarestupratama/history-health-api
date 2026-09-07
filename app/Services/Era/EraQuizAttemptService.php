<?php

namespace App\Services\Era;

use App\Models\EraQuiz;
use App\Models\User;
use App\Models\UserEraQuizAttempt;

class EraQuizAttemptService
{
    /**
     * R-ERAQUIZ-04: submit dilakukan sekali di akhir (setelah semua soal
     * dijawab), bukan progresif per-soal seperti kuis year.
     * R-ERAQUIZ-08: setiap submit (termasuk retake) meng-OVERWRITE row yang
     * sama via UserEraQuizAttempt::recordAttempt() (updateOrCreate), bukan
     * membuat row baru.
     *
     * Format $answers SAMA dengan pola quiz year (StoreQuizAttemptRequest):
     * object map { "<question_id>": <option_id>, ... } — bukan array of
     * objects, supaya konsisten dan bisa reuse pola validasi yang sama.
     *
     * @param  array<int|string, int>  $answers
     */
    public function submit(User $user, EraQuiz $eraQuiz, array $answers): UserEraQuizAttempt
    {
        return UserEraQuizAttempt::recordAttempt($user->id, $eraQuiz->id, $answers);
    }

    /**
     * Ringkasan skor untuk halaman Hasil: total benar/salah + persentase.
     * Skor ini TIDAK disimpan sebagai kolom — dihitung on-the-fly dari
     * `answers` (attempt) dibanding `is_correct` tiap opsi, sama filosofi
     * penghitungan on-the-fly yang dipakai di seluruh sistem kuis.
     *
     * @return array{total: int, correct: int, incorrect: int, percentage: int}
     */
    public function buildResult(UserEraQuizAttempt $attempt): array
    {
        $eraQuiz = $attempt->eraQuiz()->with('questions.options')->first();
        $answers = $attempt->answers ?? [];

        $total = $eraQuiz->questions->count();
        $correct = $eraQuiz->questions->filter(function ($question) use ($answers) {
            $selectedOptionId = $answers[$question->id] ?? null;

            if ($selectedOptionId === null) {
                return false;
            }

            $selectedOption = $question->options->firstWhere('id', (int) $selectedOptionId);

            return (bool) $selectedOption?->is_correct;
        })->count();

        return [
            'total' => $total,
            'correct' => $correct,
            'incorrect' => $total - $correct,
            'percentage' => $total > 0 ? (int) round(($correct / $total) * 100) : 0,
        ];
    }

    /**
     * Rekap penuh untuk halaman "Lihat Rekapan": semua soal 1 halaman,
     * masing-masing dengan opsi yang dipilih user, status benar/salah, opsi
     * yang benar (untuk di-highlight hijau), dan explanation yang sesuai
     * (explanation_correct / explanation_incorrect via explanationFor()).
     *
     * @return \Illuminate\Support\Collection
     */
    public function buildRecap(UserEraQuizAttempt $attempt): \Illuminate\Support\Collection
    {
        $eraQuiz = $attempt->eraQuiz()->with('questions.options')->first();
        $answers = $attempt->answers ?? [];

        return $eraQuiz->questions->map(function ($question) use ($answers) {
            $selectedOptionId = $answers[$question->id] ?? null;
            $selectedOption = $selectedOptionId !== null
                ? $question->options->firstWhere('id', (int) $selectedOptionId)
                : null;
            $correctOption = $question->options->firstWhere('is_correct', true);
            $isCorrect = (bool) $selectedOption?->is_correct;

            return [
                'question' => $question,
                'selected_option_id' => $selectedOption?->id,
                'correct_option_id' => $correctOption?->id,
                'is_correct' => $isCorrect,
                'explanation' => $question->explanationFor($isCorrect),
            ];
        });
    }
}