<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Mengacu migration `2026_08_28_193336_create_user_quiz_attempts_table.php`.
 *
 * REVISI BESAR: kuis formatif year kini BERSKOR + punya passing grade 75%
 * (Quiz::PASSING_GRADE_PERCENTAGE) — beda total dari filosofi lama "tanpa
 * skor sama sekali". Konsekuensinya:
 * - Row ini SEKARANG BOLEH ditimpa (retake) kalau user belum lulus, mirip
 *   pola UserEraQuizAttempt — bukan lagi idempotent/insert-once. Constraint
 *   unik (`user_id`, `quiz_id`) tetap dipasang di DB, tapi dipakai untuk
 *   "1 user 1 row per quiz yang di-overwrite", bukan lagi "1 user 1 row
 *   permanen tidak berubah".
 * - `YearCompletionService::isCompleted()` sekarang cek row ini ADA *dan*
 *   `isPassing()` true dari attempt TERKINI (bukan cuma existence row),
 *   R-PROG-07 (revisi).
 * - `answers` sekarang aktif dipakai untuk hitung skor on-the-fly (bukan
 *   cuma rekap pasif) — dibandingkan ke `is_correct` tiap
 *   `quiz_question_option_id` yang tersimpan di dalamnya.
 */
class UserQuizAttempt extends Model
{
    use HasFactory;

    public $timestamps = false; // cuma punya completed_at, sama pola dengan UserEraQuizAttempt

    protected $fillable = [
        'user_id',
        'quiz_id',
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

    public function quiz()
    {
        return $this->belongsTo(Quiz::class);
    }

    /**
     * R-QUIZ-08 (revisi total — dulu idempotent, sekarang retake-overwrite):
     * pola sama persis dengan UserEraQuizAttempt::recordAttempt(), pakai
     * updateOrCreate() bukan firstOrCreate(). Dipanggil setiap kali user
     * submit/selesai kuis formatif, baik attempt pertama maupun retake
     * setelah gagal (skor < passing grade).
     */
    public static function recordAttempt(int $userId, int $quizId, array $answers): self
    {
        return static::updateOrCreate(
            ['user_id' => $userId, 'quiz_id' => $quizId],
            ['answers' => $answers, 'completed_at' => now()]
        );
    }

    /**
     * Jumlah jawaban benar pada attempt TERKINI (dari `answers` yang
     * tersimpan saat ini), dihitung on-the-fly — bukan kolom tersimpan.
     * `answers` berbentuk object map { "<quiz_question_id>": <quiz_question_option_id>, ... }.
     */
    public function correctCount(): int
    {
        $selectedOptionIds = array_values($this->answers ?? []);

        if (empty($selectedOptionIds)) {
            return 0;
        }

        $correctOptionIds = QuizQuestionOption::whereIn('id', $selectedOptionIds)
            ->where('is_correct', true)
            ->pluck('id')
            ->all();

        return count(array_intersect($selectedOptionIds, $correctOptionIds));
    }

    /**
     * Total soal yang dijawab pada attempt ini. Untuk kuis formatif ini
     * seharusnya selalu sama dengan Quiz::QUESTION_COUNT (10), karena semua
     * soal wajib dijawab sebelum submit — tapi tetap dihitung dari isi
     * `answers` (bukan hardcode 10) supaya konsisten dengan pola
     * UserEraQuizAttempt::totalCount().
     */
    public function totalCount(): int
    {
        return count($this->answers ?? []);
    }

    /**
     * Skor dalam persen (0-100), dibulatkan 2 desimal. Selalu dihitung
     * ulang dari `answers` TERKINI — tidak ada kolom skor tersimpan.
     */
    public function scorePercentage(): float
    {
        $total = $this->totalCount();

        return $total > 0
            ? round($this->correctCount() / $total * 100, 2)
            : 0.0;
    }

    /**
     * R-QUIZ-09 (baru): lulus jika skor >= Quiz::PASSING_GRADE_PERCENTAGE
     * (75%). Dipakai YearCompletionService::isCompleted() sebagai syarat
     * "year completed", dan dipakai layar Hasil untuk tampilkan status
     * lulus/tidak lulus.
     */
    public function isPassing(): bool
    {
        return $this->scorePercentage() >= Quiz::PASSING_GRADE_PERCENTAGE;
    }
}