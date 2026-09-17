<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Year extends Model
{
    use HasFactory;

    protected $fillable = [
        'era_id',
        'year',
        'title',
        // (Revisi — Rangkuman Interaktif) `summary_image` DIHAPUS dari sini.
        // Rangkuman wabah kini di relasi summary() -> YearSummary (7 poin
        // correct-statement), bukan lagi 1 kolom link infografis di years.
        'quote_text',    // (baru) 1 kutipan teks per wabah
        'references',    // (baru) list teks referensi, disimpan sbg JSON array
    ];

    protected function casts(): array
    {
        return [
            'references' => 'array',
        ];
    }

    public function era()
    {
        return $this->belongsTo(Era::class);
    }

    public function sections()
    {
        return $this->hasMany(Section::class)->orderBy('order');
    }

    public function vaccines()
    {
        return $this->belongsToMany(Vaccine::class, 'year_vaccine');
    }

    public function quiz()
    {
        return $this->hasOne(Quiz::class);
    }

    /**
     * Rangkuman Interaktif ("correct statement") milik year ini —
     * menggantikan `summary_image` (dulu 1 link infografis statis).
     * 1 year hanya punya 1 YearSummary (unique constraint di migration).
     */
    public function summary()
    {
        return $this->hasOne(YearSummary::class);
    }
}