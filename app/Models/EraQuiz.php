<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EraQuiz extends Model
{
    use HasFactory;

    protected $fillable = [
        'era_id',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }

    public function era()
    {
        return $this->belongsTo(Era::class);
    }

    public function questions()
    {
        return $this->hasMany(EraQuizQuestion::class)->orderBy('order');
    }

    public function attempts()
    {
        return $this->hasMany(UserEraQuizAttempt::class);
    }

    /**
     * R-ERAQUIZ-10: syarat publish = minimal 1 soal + setiap soal wajib
     * punya explanation_correct & explanation_incorrect terisi.
     * Beda dari Quiz::canPublish() (year): TIDAK ada syarat "summary
     * terisi", karena era tidak punya kolom summary (lihat Schema.md).
     */
    public function canPublish(): bool
    {
        return $this->questions()->exists()
            && $this->questions->every(
                fn ($question) => filled($question->explanation_correct)
                    && filled($question->explanation_incorrect)
            );
    }
}