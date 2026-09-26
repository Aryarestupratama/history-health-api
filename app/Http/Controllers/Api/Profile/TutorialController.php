<?php

namespace App\Http\Controllers\Api\Profile;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Satu-satunya tanggung jawab controller ini: tandai
 * `users.has_seen_onboarding_tutorial` jadi true untuk user yang sedang
 * login. Dipanggil TutorialTourController (Flutter) di titik yang SAMA
 * dengan `_markSeen()` lokal SharedPreferences sebelumnya (begitu step
 * terakhir tur selesai) — panggilan lokal itu TETAP dipertahankan sebagai
 * fallback offline, endpoint ini yang jadi sumber kebenaran per-akun.
 *
 * Sengaja tidak pakai apiResource/PATCH ke `auth/me` — cuma 1 aksi
 * spesifik (mark-seen, satu arah, tanpa payload), sama pola dengan
 * `CardController::markSeen()` / `BadgeController::markSeen()`.
 */
class TutorialController extends Controller
{
    public function markSeen(Request $request): JsonResponse
    {
        $request->user()->markOnboardingTutorialSeen();

        return response()->json([
            'message' => 'Status tutorial diperbarui.',
            'user' => new UserResource($request->user()),
        ]);
    }
}