<?php

namespace App\Http\Controllers\Api\Badge;

use App\Http\Controllers\Controller;
use App\Http\Resources\BadgeResource;
use App\Models\CaseStudy;
use App\Models\UserCaseStudyAttempt;
use Illuminate\Http\Request;

class BadgeController extends Controller
{
    /**
     * Koleksi Badge (Fase 2) — mirror CardController::index() (Koleksi
     * Vaksin): badge yang belum didapat TETAP muncul di list (locked),
     * tidak disembunyikan, beda pola cuma di resource (lihat
     * BadgeResource — locked tetap kirim nama/ikon asli).
     *
     * Hanya CaseStudy yang is_published=true yang dianggap ada badge-nya —
     * selaras gate akses studi kasus lain (section tidak unlocked kalau
     * belum publish), jadi tidak mungkin ada badge "bocor" dari studi kasus
     * draft yang belum publish admin.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Eager-load section.year.era supaya BadgeResource (year/era di
        // response) tidak kena N+1 per badge.
        $caseStudies = CaseStudy::where('is_published', true)
            ->with('section.year.era')
            ->get();

        // Key by case_study_id -> attempt (bukan cuma bool) supaya
        // BadgeResource bisa turunkan unlocked_at dari completed_at yang
        // sama, tanpa query kedua.
        $attemptsByCaseStudyId = UserCaseStudyAttempt::query()
            ->where('user_id', $user->id)
            ->whereIn('case_study_id', $caseStudies->pluck('id'))
            ->get()
            ->keyBy('case_study_id');

        $data = $caseStudies
            ->map(
                fn ($caseStudy) => (new BadgeResource($caseStudy))
                    ->withAttempt($attemptsByCaseStudyId->get($caseStudy->id))
            )
            ->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $caseStudies->count(),
                // Dihitung langsung dari attempt (isCompleted(), R-CASE-08
                // sticky) — bukan re-serialize $data, sama pola dengan
                // CardController::index() yang pakai $unlocksByVaccineId
                // langsung.
                'unlocked' => $attemptsByCaseStudyId
                    ->filter(fn ($attempt) => $attempt->isCompleted())
                    ->count(),
                // Dipakai dot merah bottom nav Profil (main_shell.dart) &
                // menu "Koleksi Badge" di ProfileScreen — mirror
                // `meta.unseen` milik /cards. Badge locked tidak pernah ikut
                // hitungan ini (lihat BadgeResource::$isUnseen).
                'unseen' => $attemptsByCaseStudyId
                    ->filter(fn ($attempt) => $attempt->isCompleted() && $attempt->seen_at === null)
                    ->count(),
            ],
        ]);
    }

    /**
     * PATCH /badges/{caseStudy}/seen — mirror endpoint mark-seen milik
     * vaksin (CardController). Dipanggil Flutter persis di titik yang sama
     * dengan pola vaksin: saat user BENERAN membuka detail badge, bukan
     * begitu badge masuk antrean reveal/grid — supaya dot & tag "Baru"
     * sempat kelihatan dulu sebelum hilang.
     *
     * Idempotent & permisif secara sengaja (tidak pernah 404/422): kalau
     * user belum pernah punya attempt, attempt belum completed, atau
     * seen_at sudah terisi sebelumnya, endpoint ini tetap sukses tanpa
     * efek — supaya Flutter tidak perlu menjaga urutan panggilan dengan
     * hati-hati (unawaited() seperti markVaccineSeen di
     * vaccine_list_screen.dart).
     */
    public function markSeen(Request $request, CaseStudy $caseStudy)
    {
        $user = $request->user();

        $attempt = UserCaseStudyAttempt::query()
            ->where('user_id', $user->id)
            ->where('case_study_id', $caseStudy->id)
            ->first();

        if ($attempt && $attempt->isCompleted() && $attempt->seen_at === null) {
            $attempt->update(['seen_at' => now()]);
        }

        return response()->noContent();
    }
}