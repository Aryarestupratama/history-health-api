<?php

namespace App\Http\Controllers\Api\Card;

use App\Http\Controllers\Controller;
use App\Http\Resources\VaccineCardResource;
use App\Http\Resources\VaccineDetailResource;
use App\Models\Vaccine;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $unlockedVaccineIds = $user->vaccineUnlocks()->pluck('vaccine_id')->flip();

        // R-VAC-04: vaccine yang belum unlock tetap muncul di list (siluet),
        // bukan disembunyikan.
        $vaccines = Vaccine::orderBy('name')->get();

        $data = $vaccines->map(
            fn ($vaccine) => (new VaccineCardResource($vaccine))
                ->withUnlockStatus($unlockedVaccineIds->has($vaccine->id))
        )->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $vaccines->count(),
                'unlocked' => $unlockedVaccineIds->count(),
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

        return new VaccineDetailResource($vaccine);
    }
}