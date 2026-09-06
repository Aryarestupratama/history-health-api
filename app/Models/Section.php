<?php

namespace App\Models;

use App\Services\Content\LinkParserService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'year_id',
        'title', // tetap disimpan (label admin di Content Studio), tidak lagi dirender sebagai judul di layar end-user
        'header_image', // (baru) opsional, raw link Google Drive — boleh kosong per section
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

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
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