<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CaseStudyOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'case_study_id',
        'title',
        'description',
        'order',
        'correct_rank',
    ];

    protected function casts(): array
    {
        return [
            'correct_rank' => 'integer',
        ];
    }

    public function caseStudy()
    {
        return $this->belongsTo(CaseStudy::class);
    }

    /**
     * true jika opsi ini termasuk 3 prioritas benar (correct_rank 1/2/3),
     * false jika pengecoh (correct_rank null).
     */
    public function isCorrectRankOption(): bool
    {
        return $this->correct_rank !== null;
    }

    /**
     * PENTING — sama filosofi dengan YearSummaryPointOption::is_correct:
     * kolom `correct_rank` SENGAJA TIDAK di-$hidden() di sini (model ini
     * juga dipakai admin, yang justru butuh melihat correct_rank untuk
     * dropdown "Prioritas 1/2/3/Pengecoh"). Endpoint USER-facing
     * (CaseStudyService::getOptionsForAttempt() atau sejenisnya) WAJIB
     * membangun array manual tanpa field ini sebelum dikirim ke response,
     * persis pola YearSummaryService::getPointsForAttempt() — JANGAN
     * pernah return Model/Resource mentah opsi ini di endpoint user.
     */
}