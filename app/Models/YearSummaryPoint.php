<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YearSummaryPoint extends Model
{
    use HasFactory;

    protected $fillable = [
        'year_summary_id',
        'order',
    ];

    public function yearSummary()
    {
        return $this->belongsTo(YearSummary::class);
    }

    public function options()
    {
        return $this->hasMany(YearSummaryPointOption::class)->orderBy('order');
    }

    /**
     * Kalimat rangkuman asli (bukan pengecoh) untuk poin ini — dipakai saat
     * merangkai "Rangkuman Lengkap" (SUM-03) setelah user menyelesaikan
     * ke-7 poin.
     */
    public function correctOption()
    {
        return $this->options()->where('is_correct', true)->first();
    }
}