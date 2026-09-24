<?php

namespace App\Models;

use App\Services\Content\LinkParserService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    /**
     * (Baru — Fase 1 Studi Kasus) `order` yang dipesan khusus untuk section
     * bertipe `case_study` — setiap year dipastikan punya 9 section, section
     * bacaan hanya memakai order 1-7 & 9, order 8 SELALU studi kasus.
     * Dipakai bersama oleh Service/FormRequest untuk menegakkan R-CASE
     * (guard "order=8 hanya boleh case_study, dan sebaliknya") — tidak
     * ditegakkan sebagai constraint DB (lihat migration sections).
     */
    public const CASE_STUDY_ORDER = 8;

    protected $fillable = [
        'year_id',
        'title', // tetap disimpan (label admin di Content Studio), tidak lagi dirender sebagai judul di layar end-user
        'header_image', // (baru) opsional, raw link Google Drive — boleh kosong per section
        'type', // (baru) 'reading' (default) atau 'case_study'
        'order',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'order' => 'integer',
        ];
    }

    protected $appends = ['resolved_header_image_url'];

    public function year()
    {
        return $this->belongsTo(Year::class);
    }

    public function contentBlocks()
    {
        return $this->hasMany(ContentBlock::class)->orderBy('order');
    }

    public function progress()
    {
        return $this->hasMany(UserProgress::class);
    }

    /**
     * (Baru) 1 section case_study punya paling banyak 1 CaseStudy — mirror
     * pola Year::summary()/Year::quiz() (hasOne), tapi levelnya section
     * karena konten studi kasus menempel ke section ke-8, bukan ke year
     * langsung.
     */
    public function caseStudy()
    {
        return $this->hasOne(CaseStudy::class);
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    /**
     * (Baru) Section bacaan biasa (content_blocks) — dipakai di tempat yang
     * dulu implisit menganggap SEMUA section adalah bacaan (mis. render
     * blok konten, hitung "section published" untuk sequential unlock TETAP
     * menghitung semua type, tapi renderer detail section perlu membedakan).
     */
    public function scopeReading($query)
    {
        return $query->where('type', 'reading');
    }

    /**
     * (Baru) Section studi kasus — selalu order=8 per year, dipakai untuk
     * query cepat "ambil section case_study milik year X" tanpa hardcode
     * angka 8 berulang-ulang di berbagai tempat.
     */
    public function scopeCaseStudyType($query)
    {
        return $query->where('type', 'case_study');
    }

    public function isCaseStudy(): bool
    {
        return $this->type === 'case_study';
    }

    /**
     * URL siap pakai (direct-view) dari `header_image`, atau null kalau
     * section ini tidak diisi header gambar (opsional per section).
     */
    public function getResolvedHeaderImageUrlAttribute(): ?string
    {
        if (empty($this->header_image)) {
            return null;
        }

        return app(LinkParserService::class)->toDriveImageUrl($this->header_image);
    }
}