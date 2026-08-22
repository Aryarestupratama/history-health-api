<?php

namespace App\Http\Controllers\Api\Card;

use App\Http\Controllers\Controller;
use App\Http\Resources\FigureCardResource;
use App\Http\Resources\FigureDetailResource;
use App\Models\Figure;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $unlockedFigureIds = $user->cardUnlocks()->pluck('figure_id')->flip();

        // R-CARD-04: figure yang belum unlock tetap muncul di list (siluet),
        // bukan disembunyikan.
        $figures = Figure::orderBy('name')->get();

        $data = $figures->map(
            fn ($figure) => (new FigureCardResource($figure))
                ->withUnlockStatus($unlockedFigureIds->has($figure->id))
        )->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $figures->count(),
                'unlocked' => $unlockedFigureIds->count(),
            ],
        ]);
    }

    public function show(Request $request, Figure $figure)
    {
        $isUnlocked = $request->user()->cardUnlocks()->where('figure_id', $figure->id)->exists();

        // R-CARD-02: detail hanya untuk yang sudah unlock.
        // Diperlakukan sebagai 404 supaya konsisten dengan pola section draft
        // di atas (tidak membedakan "tidak ada" vs "belum unlock" ke client).
        if (! $isUnlocked) {
            throw new NotFoundHttpException();
        }

        return new FigureDetailResource($figure);
    }
}