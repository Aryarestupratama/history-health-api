<?php

namespace App\Services\Quiz;

use App\Models\Quiz;
use App\Models\QuizQuestion;
use App\Models\User;
use App\Models\UserQuizAttempt;

/**
 * Service BARU untuk kuis formatif (year) — sebelumnya logic ini nempel
 * langsung di UserQuizController karena kuis formatif belum berskor
 * (cukup insert-once/idempotent, tidak butuh orkestrasi). Sekarang kuis
 * formatif BERSKOR + boleh di-retake (Quiz::PASSING_GRADE_PERCENTAGE, 75%),
 * jadi logic ini ditarik ke service supaya konsisten dengan pola
 * EraQuizAttemptService.
 */
class QuizAttemptService
{
    /**
     * Ambil attempt yang sedang berjalan, atau buat draft baru kalau user
     * belum pernah mulai kuis ini sama sekali. TIDAK dipakai untuk retry
     * (lihat retry() di bawah) — kalau attempt sudah completed_at (baik
     * lulus maupun gagal), method ini mengembalikan attempt yang sama apa
     * adanya (read-only sampai user memanggil retry() secara eksplisit).
     */
    public function getOrCreateAttempt(User $user, Quiz $quiz): UserQuizAttempt
    {
        return UserQuizAttempt::firstOrCreate(
            ['user_id' => $user->id, 'quiz_id' => $quiz->id],
            ['answers' => [], 'completed_at' => null]
        );
    }

    /**
     * Boleh dijawab (progresif) hanya kalau attempt belum completed_at.
     * Begitu completed_at ke-set (semua soal terjawab), attempt terkunci
     * sampai user retry() secara eksplisit — berlaku baik attempt itu
     * akhirnya lulus maupun gagal, supaya state selalu jelas (tidak ada
     * "menjawab ulang diam-diam" tanpa lewat alur retry).
     */
    public function canAnswer(UserQuizAttempt $attempt): bool
    {
        return $attempt->completed_at === null;
    }

    /**
     * Simpan 1 jawaban secara progresif (upsert per-key ke `answers`),
     * sama pola dengan versi lama di controller. Begitu SEMUA soal quiz
     * ini sudah terjawab, `completed_at` di-set otomatis.
     *
     * @return array{is_complete: bool}
     */
    public function recordAnswer(UserQuizAttempt $attempt, Quiz $quiz, QuizQuestion $question, int $optionId): array
    {
        $answers = $attempt->answers ?? [];
        $answers[$question->id] = $optionId;
        $attempt->answers = $answers;

        $allQuestionIds = $quiz->questions()->pluck('id');
        $answeredQuestionIds = collect(array_keys($answers))->map(fn ($id) => (int) $id);
        $isComplete = $allQuestionIds->diff($answeredQuestionIds)->isEmpty();

        if ($isComplete) {
            $attempt->completed_at = now();
        }

        $attempt->save();

        return ['is_complete' => $isComplete];
    }

    /**
     * R-QUIZ-08 (revisi total — boleh retake sampai lulus): reset attempt
     * ke kondisi kosong (answers: [], completed_at: null) supaya user bisa
     * mengerjakan ulang dari soal pertama. HANYA boleh dipanggil kalau
     * attempt yang ada BELUM lulus — kalau sudah lulus, dilarang retry
     * (tidak ada gunanya, year sudah completed).
     *
     * @throws \RuntimeException jika attempt sudah lulus
     */
    public function retry(User $user, Quiz $quiz): UserQuizAttempt
    {
        $attempt = UserQuizAttempt::where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->first();

        if ($attempt && $attempt->isPassing()) {
            throw new \RuntimeException('Kuis ini sudah lulus, tidak perlu dikerjakan ulang.');
        }

        return UserQuizAttempt::updateOrCreate(
            ['user_id' => $user->id, 'quiz_id' => $quiz->id],
            ['answers' => [], 'completed_at' => null]
        );
    }
}