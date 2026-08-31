<?php

namespace App\Http\Controllers\Admin\Era;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Era\UpdateEraRequest;
use App\Models\Era;

class EraController extends Controller
{
    // Catatan: method store() sengaja dihilangkan — 3 era (Kolonial/
    // Kemerdekaan/Modern) sudah paten diisi via EraSeeder, tidak ada
    // jalur API untuk membuat era baru. Route hanya index/show/update/destroy
    // (lihat routes/api.php: apiResource('eras', ...)->only([...])).

    public function index()
    {
        return Era::withCount('years')->orderBy('order')->get();
    }

    public function show(Era $era)
    {
        return $era->load('years');
    }

    public function update(UpdateEraRequest $request, Era $era)
    {
        $era->update($request->validated());

        return $era;
    }

    public function destroy(Era $era)
    {
        $era->delete();

        return response()->json(null, 204);
    }
}