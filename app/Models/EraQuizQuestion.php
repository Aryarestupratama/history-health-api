<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EraQuizQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'era_quiz_id',
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

    public function eraQuiz()
    {
        return $this->belongsTo(EraQuiz::class);
    }

    public function options()
    {
        return $this->hasMany(EraQuizQuestionOption::class)->orderBy('order');
    }

    /**
     * R-ERAQUIZ-05: pilih teks explanation yang sesuai berdasarkan hasil
     * jawaban user, sama pola dengan QuizQuestion::explanationFor() —
     * bedanya di era quiz ini dipanggil untuk SEMUA soal sekaligus saat
     * submit (bukan per-soal instan), karena review ditampilkan sekaligus.
     */
    public function explanationFor(bool $isCorrect): string
    {
        return $isCorrect ? $this->explanation_correct : $this->explanation_incorrect;
    }
}