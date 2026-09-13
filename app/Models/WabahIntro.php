<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Services\Content\LinkParserService;

/**
 * Konten singleton "Apa itu Wabah" — selalu cuma 1 row (id=1).
 *
 * Diakses hanya lewat satu entry point: ikon info di header roadmap
 * era pada tab Informasi Sejarah. Tidak ada lagi auto-show maupun
 * banner per-era (dihapus per revisi spec).
 *
 * Kontennya murni infografis, tanpa teks pendukung (caption dihapus).
 *
 * image_link menyimpan raw link Google Drive apa adanya (pola sama
 * dengan content_blocks.content & vaccines.photo, lihat Schema.md §5).
 * Konversi ke direct-view URL dilakukan di accessor image_url,
 * bukan disimpan di DB.
 */
class WabahIntro extends Model
{
    protected $table = 'wabah_intro';

    protected $fillable = [
        'image_link',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }

    /**
     * Ambil satu-satunya row konten ini. Null kalau belum pernah diisi
     * admin sama sekali (belum di-seed / belum dibuat lewat CMS).
     */
    public static function current(): ?self
    {
        return static::query()->first();
    }

    /**
     * Direct-view URL dari image_link, dikonversi via LinkParserService
     * yang sama dipakai content_blocks/vaccines (bukan method baru).
     */
    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image_link) {
            return null;
        }

        return app(LinkParserService::class)->toDriveImageUrl($this->image_link);
    }
}