<?php

namespace App\Models;

use App\Services\Content\LinkParserService;
use Illuminate\Database\Eloquent\Model;

/**
 * Aset Border SEKALA — selalu cuma 1 row (id=1), sama pola singleton
 * dengan `WabahIntro`.
 *
 * BEDA dari `WabahIntro` (yang sekarang isinya teks/`content`): border
 * tetap berupa GAMBAR, jadi kolomnya `image_link` (link Drive mentah)
 * + accessor `image_url` — BUKAN kolom `content`.
 *
 * KOREKSI: `LinkParserService` ternyata service instance (di-resolve
 * lewat `app(LinkParserService::class)`, dikonfirmasi dari
 * `ValidGoogleDriveLink` yang juga begitu), BUKAN static call seperti
 * draf awal saya. Accessor di bawah menyesuaikan.
 *
 * PENTING: tabel ini CUMA soal aset gambar border. Logic KAPAN border
 * terbuka untuk user (`users.frame_unlocked_at`, `BorderUnlockService`,
 * R-FRAME-01/02) sama sekali TIDAK ada di model ini dan TIDAK berubah —
 * lihat catatan di migration `create_sekala_borders_table`.
 */
class SekalaBorder extends Model
{
    protected $table = 'sekala_borders';

    protected $fillable = [
        'image_link',
        'is_published',
    ];

    // Supaya `image_url` ikut ke response JSON tanpa perlu Resource
    // terpisah -- sama pola `WabahIntro`/`Vaccine` sebelumnya. Kalau nanti
    // butuh bentuk response yang lebih terkontrol (mis. sembunyikan
    // `image_link` mentah dari publik), pertimbangkan pindah ke
    // Resource ketimbang ubah $appends di sini.
    protected $appends = ['image_url'];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }

    /**
     * Ambil satu-satunya row aset border ini. Null kalau belum pernah
     * diisi admin sama sekali (belum di-seed / belum dibuat lewat CMS).
     */
    public static function current(): ?self
    {
        return static::query()->first();
    }

    // CATATAN: nama method `toDriveImageUrl()` diambil dari referensi di
    // Schema.md ("accessor image_url reuse LinkParserService::
    // toDriveImageUrl()"), BELUM saya konfirmasi langsung ke isi
    // `LinkParserService.php` yang sebenarnya (baru lihat
    // `ValidGoogleDriveLink` yang makai `isValidDriveLink()`). Kalau nama
    // method aslinya beda, ganti baris di bawah saja — bentuk
    // pemanggilannya (`app(LinkParserService::class)->...`) sudah benar.
    public function getImageUrlAttribute(): ?string
    {
        if (blank($this->image_link)) {
            return null;
        }

        return app(LinkParserService::class)->toDriveImageUrl($this->image_link);
    }
}