<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quiz extends Model
{
    use HasFactory;

    /**
     * R-QUIZ-06 (revisi): jumlah soal kini FIX 10 per kuis year — tidak
     * boleh kurang maupun lebih (beda dari versi lama yang cuma maks 5).
     */
    public const QUESTION_COUNT = 10;

    /**
     * R-QUIZ-11 (baru): nilai minimum kelulusan untuk kuis formatif, dalam
     * persen. Ditampilkan ke user di layar sebelum mulai mengerjakan, dan
     * dipakai UserQuizAttempt::isPassing() untuk menentukan lulus/tidak.
     * Sama nilainya dengan EraQuiz::PASSING_GRADE_PERCENTAGE (75) — kalau
     * suatu saat perlu beda antara formatif & sumatif, pisahkan konstanta
     * ini, jangan diam-diam disamakan lewat referensi silang antar model.
     */
    public const PASSING_GRADE_PERCENTAGE = 75;

    protected $fillable = [
        'year_id',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }

    public function year()
    {
        return $this->belongsTo(Year::class);
    }

    public function questions()
    {
        return $this->hasMany(QuizQuestion::class)->orderBy('order');
    }

    public function attempts()
    {
        return $this->hasMany(UserQuizAttempt::class);
    }

    /**
     * R-QUIZ-05: syarat publish = years.summary terisi.
     * R-QUIZ-06 (revisi): ditambah/diubah syarat jumlah soal — sekarang
     * wajib TEPAT 10 soal (bukan lagi "minimal 1"), karena kuis formatif
     * kini punya skor & passing grade sehingga jumlah soal harus konsisten
     * antar year supaya adil (tidak ada year dengan soal lebih sedikit
     * jadi "lebih gampang lulus").
     * R-QUIZ-10: ditambah syarat SETIAP soal wajib punya explanation_correct
     * & explanation_incorrect terisi — dicek di sini (saat publish), bukan
     * saat soal dibuat/diedit, karena admin sengaja boleh membuat skeleton
     * soal kosong dulu (lihat StoreQuizQuestionRequest/QuizController) dan
     * mengisi detailnya belakangan. Baru wajib lengkap begitu admin mencoba
     * publish kuis.
     */
    public function canPublish(): bool
    {
        return $this->questions()->count() === self::QUESTION_COUNT
            && filled($this->year->summary)
            && $this->questions->every(
                fn ($question) => filled($question->explanation_correct)
                    && filled($question->explanation_incorrect)
            );
    }
}