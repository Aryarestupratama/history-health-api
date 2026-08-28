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
     */
    public function canPublish(): bool
    {
        return $this->questions()->exists()
            && filled($this->year->summary);
    }
}