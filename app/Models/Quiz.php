<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quiz extends Model
{
    use HasFactory;

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
     * R-QUIZ-05: syarat publish = minimal 1 soal + years.summary terisi.
     * R-QUIZ-10 (baru, revisi feedback kuis 2 kolom): ditambah syarat SETIAP
     * soal wajib punya explanation_correct & explanation_incorrect terisi —
     * dicek di sini (saat publish), bukan saat soal dibuat/diedit, karena
     * admin sengaja boleh membuat skeleton soal kosong dulu (lihat
     * StoreQuizQuestionRequest/QuizController) dan mengisi detailnya
     * belakangan. Baru wajib lengkap begitu admin mencoba publish kuis.
     */
    public function canPublish(): bool
    {
        return $this->questions()->exists()
            && filled($this->year->summary)
            && $this->questions->every(
                fn ($question) => filled($question->explanation_correct)
                    && filled($question->explanation_incorrect)
            );
    }
}