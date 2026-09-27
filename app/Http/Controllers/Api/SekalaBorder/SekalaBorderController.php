<?php

namespace App\Http\Controllers\Api\SekalaBorder;

use App\Http\Controllers\Controller;
use App\Models\SekalaBorder;

/**
 * Endpoint publik untuk aset Border SEKALA — dipanggil Flutter untuk
 * mengambil `image_url` yang dipasang ke foto profil (menggantikan
 * `Image.asset(...)` placeholder gradient, lihat progress.md Fase 3).
 *
 * Pola sama dengan `WabahIntroController` publik (`show()` tanpa auth,
 * guest juga boleh akses — border dipasang di layar Profil yang memang
 * bisa dilihat guest, meski guest tidak bisa unlock/pasang beneran).
 *
 * BEDA dengan admin `SekalaBorderController::show()`: yang publik ini
 * di-GATE oleh `is_published` — kalau belum di-publish admin (atau
 * belum pernah diisi sama sekali), user tidak boleh dapat `image_link`
 * mentah/`image_url` walau row-nya sudah ada di DB (skeleton/draft).
 * Ini beda filosofi dari beberapa endpoint publik lain yang tidak selalu
 * gate is_published eksplisit di controller (mis. WabahIntro) — kalau
 * ternyata WabahIntro publik juga sudah gate is_published, sesuaikan
 * saja controller ini disamakan.
 */
class SekalaBorderController extends Controller
{
    public function show()
    {
        $border = SekalaBorder::current();

        if (! $border || ! $border->is_published) {
            return response()->json([
                'is_published' => false,
                'image_url' => null,
            ]);
        }

        return response()->json([
            'is_published' => true,
            'image_url' => $border->image_url,
        ]);
    }
}