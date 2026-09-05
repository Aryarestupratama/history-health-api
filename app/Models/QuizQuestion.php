<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'quiz_id',
        'order',
        'question',
        'explanation_correct',
        'explanation_incorrect',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
        ];
    }

    public function quiz()
    {
        return $this->belongsTo(Quiz::class);
    }

    public function options()
    {
        return $this->hasMany(QuizQuestionOption::class)->orderBy('order');
    }

    /**
     * R-QUIZ-04: pilih teks explanation yang sesuai berdasarkan hasil
     * jawaban user, supaya logic "pilih kolom mana" tidak terduplikasi
     * di controller/resource yang menampilkan feedback kuis.
     */
    public function explanationFor(bool $isCorrect): string
    {
        return $isCorrect ? $this->explanation_correct : $this->explanation_incorrect;
    }
}