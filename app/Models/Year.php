<?php

namespace App\Models;

use App\Services\Content\LinkParserService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Year extends Model
{
    use HasFactory;

    protected $fillable = [
        'era_id',
        'year',
        'title',
        'summary_image', // (revisi) dulu `summary` (teks), sekarang link gdrive infografis
        'quote_text',    // (baru) 1 kutipan teks per wabah
        'references',    // (baru) list teks referensi, disimpan sbg JSON array
    ];

    protected function casts(): array
    {
        return [
            'references' => 'array',
        ];
    }

    protected $appends = ['resolved_summary_image_url'];

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
     * URL siap pakai (direct-view) dari `summary_image`, atau null kalau
     * belum diisi admin (rangkuman infografis belum ada).
     */
    public function getResolvedSummaryImageUrlAttribute(): ?string
    {
        if (empty($this->summary_image)) {
            return null;
        }

        return app(LinkParserService::class)->toDriveImageUrl($this->summary_image);
    }
}