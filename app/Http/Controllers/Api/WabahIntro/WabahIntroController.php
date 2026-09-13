<?php

namespace App\Http\Controllers\Api\WabahIntro;

use App\Http\Controllers\Controller;
use App\Http\Resources\WabahIntroResource;
use App\Models\WabahIntro;

/**
 * Endpoint publik untuk konten "Apa itu Wabah" — sengaja TIDAK di balik
 * middleware auth, karena guest juga tetap harus bisa mengakses konten
 * ini lewat ikon info di header roadmap (sama prinsipnya dengan guest
 * yang tetap bisa baca section pertama tahun kronologis pertama tiap
 * era, lihat Architecture.md §4.4).
 *
 * Tidak ada lagi auto-show maupun status "sudah lihat" — konten ini
 * hanya diakses lewat satu entry point (ikon info), jadi tidak ada
 * lagi method markSeen() (dihapus per revisi spec).
 */
class WabahIntroController extends Controller
{
    public function show()
    {
        $intro = WabahIntro::current();

        // Belum diisi admin sama sekali, atau masih draft (belum
        // di-publish) -> anggap belum ada konten untuk end user.
        if (! $intro || ! $intro->is_published) {
            return response()->json(['data' => null]);
        }

        return new WabahIntroResource($intro);
    }
}