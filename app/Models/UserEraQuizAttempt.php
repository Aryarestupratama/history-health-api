<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserEraQuizAttempt extends Model
{
    use HasFactory;

    public $timestamps = false; // hanya punya completed_at

    protected $fillable = [
        'user_id',
        'era_quiz_id',
        'answers',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function eraQuiz()
    {
        return $this->belongsTo(EraQuiz::class);
    }

    /**
     * R-ERAQUIZ-08: beda dari UserQuizAttempt (year, insert-once/idempotent),
     * kuis sumatif era BOLEH dikerjakan ulang. Setiap retake meng-OVERWRITE
     * `answers` & `completed_at` pada row yang sama, bukan membuat row baru —
     * dipanggil dari service pakai updateOrCreate(), BUKAN firstOrCreate().
     * Method ini sengaja disediakan di sini supaya semantik "overwrite" jelas
     * dan tidak keliru dipakai dengan pola firstOrCreate() seperti quiz year.
     */
    public static function recordAttempt(int $userId, int $eraQuizId, array $answers): self
    {
        return static::updateOrCreate(
            ['user_id' => $userId, 'era_quiz_id' => $eraQuizId],
            ['answers' => $answers, 'completed_at' => now()]
        );
    }

    /**
     * Jumlah jawaban benar pada attempt TERKINI. `answers` berisi
     * EraQuiz::ATTEMPT_QUESTION_COUNT (20) soal hasil randomize dari bank
     * FORMATIF (quiz_questions/quiz_question_options milik tiap year di
     * era ini) — BUKAN bank soal era sendiri lagi (dihapus total).
     */
    public function correctCount(): int
    {
        $selectedOptionIds = array_values($this->answers ?? []);

        if (empty($selectedOptionIds)) {
            return 0;
        }

        $correctOptionIds = \App\Models\QuizQuestionOption::whereIn('id', $selectedOptionIds)
            ->where('is_correct', true)
            ->pluck('id')
            ->all();

        return count(array_intersect($selectedOptionIds, $correctOptionIds));
    }

    /**
     * Total soal pada attempt ini — seharusnya selalu EraQuiz::ATTEMPT_QUESTION_COUNT
     * (20), tapi dihitung dari isi `answers` (bukan hardcode) supaya tetap
     * benar meski ATTEMPT_QUESTION_COUNT berubah di masa depan.
     */
    public function totalCount(): int
    {
        return count($this->answers ?? []);
    }

    /**
     * Skor dalam persen (0-100), dibulatkan 2 desimal — SUDAH ada sejak
     * awal (halaman Hasil menampilkan skor agregat, ERAQUIZ-03), tapi
     * sekarang dipindah jadi method reusable di model (dulu dihitung
     * langsung di EraQuizAttemptService::buildResult()).
     */
    public function scorePercentage(): float
    {
        $total = $this->totalCount();

        return $total > 0
            ? round($this->correctCount() / $total * 100, 2)
            : 0.0;
    }

    /**
     * R-ERAQUIZ-13 (baru): label lulus/tidak lulus berdasarkan passing
     * grade 75% (EraQuiz::PASSING_GRADE_PERCENTAGE) — sebelumnya halaman
     * Hasil kuis sumatif HANYA menampilkan skor tanpa status lulus/tidak;
     * sekarang keduanya ditampilkan berdampingan.
     */
    public function isPassing(): bool
    {
        return $this->scorePercentage() >= EraQuiz::PASSING_GRADE_PERCENTAGE;
    }
}