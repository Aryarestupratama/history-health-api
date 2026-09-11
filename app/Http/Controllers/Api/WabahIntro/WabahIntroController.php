<?php

namespace App\Http\Controllers\Api\WabahIntro;

use App\Http\Controllers\Controller;
use App\Http\Resources\WabahIntroResource;
use App\Models\WabahIntro;
use Illuminate\Http\Request;

/**
 * Endpoint publik untuk konten "Apa itu Wabah" — sengaja TIDAK di balik
 * middleware auth, karena guest juga wajib melihat pengenalan ini
 * sebelum masuk ke roadmap era manapun (sama prinsipnya dengan guest
 * yang tetap bisa baca section pertama tahun kronologis pertama tiap
 * era, lihat Architecture.md §4.4).
 *
 * Status "sudah lihat" TIDAK dikirim dari sini:
 * - Untuk guest: ditangani murni di Flutter (local flag), backend tidak
 *   tahu & tidak perlu tahu (guest stateless, PRD.md §5).
 * - Untuk user login: field `has_seen_wabah_intro` sudah otomatis ikut
 *   di response profil/auth user yang sudah ada (User::$fillable),
 *   tidak perlu diduplikasi di endpoint ini.
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

    /**
     * Tandai user login sudah melihat modal ini (dipanggil Flutter
     * sekali setelah modal otomatis pertama kali ditutup). Endpoint ini
     * wajib auth:sanctum (didaftarkan di grup route yang sesuai) --
     * guest tidak pernah memanggil ini.
     */
    public function markSeen(Request $request)
    {
        $request->user()->update(['has_seen_wabah_intro' => true]);

        return response()->json(['has_seen_wabah_intro' => true]);
    }
}