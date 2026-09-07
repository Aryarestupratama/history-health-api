<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Mengacu migration `2026_08_28_193336_create_user_quiz_attempts_table.php`.
 *
 * BEDA dari `UserEraQuizAttempt` (kuis sumatif era, boleh retake/overwrite,
 * R-ERAQUIZ-08): kuis year IDEMPOTENT — 1 user cuma boleh punya 1 row per
 * quiz (constraint unik `['user_id', 'quiz_id']` di migration), dan
 * `YearCompletionService::isCompleted()` cuma mengecek EXISTENCE row ini
 * (bukan isi `answers`-nya) sebagai salah satu syarat "year completed"
 * (R-PROG-07). Karena itu model ini TIDAK disediakan method
 * `recordAttempt()` model `updateOrCreate()` seperti versi era — dipakai
 * `firstOrCreate()` di pemanggilnya (kuis year TIDAK boleh mengubah hasil
 * yang sudah tersimpan begitu row pertama ada, R-QUIZ-08/idempotent),
 * bukan tugas model ini untuk menegakkan itu, cukup jadi representasi
 * tabel apa adanya.
 *
 * `answers` di migration ditandai "opsional: rekap jawaban user, tidak
 * dipakai untuk skor" — kuis year memang sengaja TIDAK ADA skor sama
 * sekali (beda filosofi dari kuis sumatif era, lihat PRD.md §6 Out of
 * Scope). Kolom ini nullable, jadi TIDAK di-cast paksa ke tipe tertentu
 * kalau memang belum tentu selalu diisi — tetap di-cast 'array' di sini
 * karena Eloquent aman menangani null pada cast array/json (hasilnya
 * null, bukan error), konsisten dengan cara `UserEraQuizAttempt`
 * menangani `answers`.
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
}