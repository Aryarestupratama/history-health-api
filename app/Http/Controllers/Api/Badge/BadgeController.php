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
            ],
        ]);
    }
}