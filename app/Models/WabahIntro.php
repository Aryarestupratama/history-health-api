<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Konten singleton "Apa itu Wabah" — selalu cuma 1 row (id=1).
 *
 * Diakses hanya lewat satu entry point: ikon info di header roadmap
 * era pada tab Informasi Sejarah. Tidak ada lagi auto-show maupun
 * banner per-era (dihapus per revisi spec).
 *
 * Kontennya murni teks biasa (paragraf penjelasan), bukan lagi
 * infografis/link Google Drive — tidak ada lagi konversi/accessor URL.
 */
class WabahIntro extends Model
{
    protected $table = 'wabah_intro';

    protected $fillable = [
        'content',
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
}