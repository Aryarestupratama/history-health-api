<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YearSummary extends Model
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

    public function points()
    {
        return $this->hasMany(YearSummaryPoint::class)->orderBy('order');
    }

    public function completions()
    {
        return $this->hasMany(UserYearSummaryCompletion::class);
    }

    /**
     * R-SUM-03: hanya bisa di-publish kalau tepat 7 poin, dan tiap poin
     * tepat 3 opsi dengan tepat 1 is_correct = true. Mirror pola
     * Quiz::canPublish() / EraQuiz::canPublish() yang sudah ada.
     *
     * Catatan: panggil di atas instance yang sudah ->fresh() atau baru
     * di-load ulang relasinya, supaya points()/options() tidak memakai
     * data lama yang sudah di-cache di memory (sama pola pemanggilan
     * $eraQuiz->fresh()->canPublish() di EraQuizSeeder/ModernSeeder).
     */
    public function canPublish(): bool
    {
        $points = $this->points()->with('options')->get();

        if ($points->count() !== 7) {
            return false;
        }

        foreach ($points as $point) {
            if ($point->options->count() !== 3) {
                return false;
            }

            if ($point->options->where('is_correct', true)->count() !== 1) {
                return false;
            }
        }

        return true;
    }
}