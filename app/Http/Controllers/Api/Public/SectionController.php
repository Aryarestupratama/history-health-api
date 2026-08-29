<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\SectionDetailResource;
use App\Models\Section;
use App\Models\User;
use App\Services\Section\SectionAccessService;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SectionController extends Controller
{
    public function __construct(
        private SectionAccessService $sectionAccessService,
    ) {
    }

    public function show(Request $request, Section $section)
    {
        // R-CMS-01: section draft tidak boleh diakses non-admin.
        // Diperlakukan sebagai 404, bukan 403 — supaya tidak bocor
        // informasi bahwa section itu "ada tapi belum publish".
        if (! $section->is_published) {
            throw new NotFoundHttpException();
        }

        $section->load(['contentBlocks', 'year.era', 'year.vaccines']);

        $user = $this->resolveUser($request);

        // R-SECT-01/02/03/04: satu jalur cek lock untuk guest maupun user
        // login, delegasi penuh ke SectionAccessService (guest = null user,
        // service sudah tahu guest tidak dapat sequential unlock).
        $isLocked = ! $this->sectionAccessService->isUnlocked($user, $section);

        if (! $user && $isLocked) {
            // R-SECT-03: guest yang mencoba akses section selain yang
            // pertama diarahkan ke ajakan login, bukan diberi response
            // locked (section itu memang tidak boleh diketahui keberadaannya
            // secara detail oleh guest).
            throw new NotFoundHttpException(
                'Section ini butuh login untuk diakses.'
            );
        }

        return (new SectionDetailResource($section))->withLockStatus($isLocked);
    }

    /**
     * Route ini publik (tanpa middleware auth:sanctum) supaya guest bisa
     * akses tanpa token — tapi kalau ada token valid di header, kita tetap
     * mau tahu siapa user-nya untuk cek sequential lock (R-SECT-02).
     * Sanctum's guard resolution normalnya butuh middleware auth:sanctum
     * (yang akan reject request tanpa token), jadi resolusi dilakukan
     * manual di sini, bukan lewat $request->user().
     */
    private function resolveUser(Request $request): ?User
    {
        $token = $request->bearerToken();

        if (! $token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);

        if (! $accessToken) {
            return null;
        }

        return $accessToken->tokenable;
    }
}