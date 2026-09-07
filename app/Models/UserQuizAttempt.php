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
}