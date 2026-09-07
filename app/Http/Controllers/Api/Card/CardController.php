<?php

namespace App\Http\Controllers\Api\Card;

use App\Http\Controllers\Controller;
use App\Http\Resources\VaccineCardResource;
use App\Http\Resources\VaccineDetailResource;
use App\Models\UserVaccineUnlock;
use App\Models\Vaccine;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Key by vaccine_id -> model unlock (bukan cuma pluck id) supaya
        // VaccineCardResource bisa turunkan status `unseen` juga dari
        // seen_at, tidak cuma locked/unlocked.
        $unlocksByVaccineId = $user->vaccineUnlocks()->get()->keyBy('vaccine_id');

        // R-VAC-04: vaccine yang belum unlock tetap muncul di list (siluet),
        // bukan disembunyikan.
        // Eager-load years.era supaya accessor Vaccine::eras (dipakai
        // VaccineCardResource buat filter per-era, VAC-04 lanjutan) tidak
        // kena N+1 query per vaksin.
        $vaccines = Vaccine::with('years.era')->orderBy('name')->get();

        $data = $vaccines->map(
            fn ($vaccine) => (new VaccineCardResource($vaccine))
                ->withUnlock($unlocksByVaccineId->get($vaccine->id))
        )->values();

        // Ringkasan per-era (total & unlocked) — dipakai Flutter buat badge
        // angka di chip filter era, mis. "Kolonial (3/5)", tanpa perlu
        // hitung ulang manual dari `data` di sisi client.
        $erasSummary = $vaccines
            ->flatMap(fn ($vaccine) => $vaccine->eras)
            ->unique('id')
            ->map(function ($era) use ($vaccines, $unlocksByVaccineId) {
                $vaccineIdsInEra = $vaccines
                    ->filter(fn ($v) => $v->eras->contains('id', $era->id))
                    ->pluck('id');

                return [
                    'id' => $era->id,
                    'name' => $era->name,
                    'slug' => $era->slug,
                    'total' => $vaccineIdsInEra->count(),
                    'unlocked' => $vaccineIdsInEra
                        ->filter(fn ($id) => $unlocksByVaccineId->has($id))
                        ->count(),
                ];
            })
            ->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $vaccines->count(),
                'unlocked' => $unlocksByVaccineId->count(),
                // Dipakai buat badge dot bottom nav & auto-scroll ke vaksin
                // yang masih perlu animasi reveal saat halaman Koleksi dibuka.
                'unseen' => $unlocksByVaccineId->whereNull('seen_at')->count(),
                'eras' => $erasSummary,
            ],
        ]);
    }

    public function show(Request $request, Vaccine $vaccine)
    {
        $isUnlocked = $request->user()->vaccineUnlocks()->where('vaccine_id', $vaccine->id)->exists();

        // R-VAC: detail hanya untuk yang sudah unlock.
        // Diperlakukan sebagai 404 supaya konsisten dengan pola section draft
        // (tidak membedakan "tidak ada" vs "belum unlock" ke client).
        if (! $isUnlocked) {
            throw new NotFoundHttpException();
        }

        // Eager-load years.era supaya accessor Vaccine::eras (dipakai
        // VaccineDetailResource) tidak kena N+1 — sama alasannya seperti
        // index() di atas.
        $vaccine->load('years.era');

        return new VaccineDetailResource($vaccine);
    }

    /**
     * Tandai vaksin sudah "dilihat" user — dipanggil Flutter begitu animasi
     * reveal locked->unlocked selesai diputar di halaman Koleksi (bukan pas
     * buka detail, karena reveal-nya terjadi di grid list, sebelum user
     * tentu membuka detail). Idempotent lewat UserVaccineUnlock::markSeen().
     */
    public function markSeen(Request $request, Vaccine $vaccine)
    {
        $unlock = $request->user()->vaccineUnlocks()->where('vaccine_id', $vaccine->id)->first();

        if ($unlock === null) {
            // Belum unlock sama sekali -> tidak masuk akal ditandai "sudah
            // dilihat", treat sebagai 404 (konsisten dengan show()).
            throw new NotFoundHttpException();
        }

        $unlock->markSeen();

        return response()->json(['seen_at' => $unlock->seen_at]);
    }
}