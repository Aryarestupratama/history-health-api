<?php

namespace App\Http\Controllers\Admin\WabahIntro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\WabahIntro\UpdateWabahIntroRequest;
use App\Models\WabahIntro;

/**
 * Beda dari controller CRUD biasa (mis. VaccineController) — wabah_intro
 * adalah tabel singleton (selalu 1 row, id=1), jadi sengaja tidak ada
 * index()/store()/destroy(). Admin hanya melihat & mengedit satu konten
 * yang sama, tidak pernah membuat/menghapus "item" baru.
 */
class WabahIntroController extends Controller
{
    public function show()
    {
        // new WabahIntro() (bukan 404) kalau belum pernah diisi sama
        // sekali — supaya form admin tetap bisa dibuka kosong untuk
        // pengisian pertama kali, bukan error.
        return WabahIntro::current() ?? new WabahIntro();
    }

    public function update(UpdateWabahIntroRequest $request)
    {
        $intro = WabahIntro::updateOrCreate(['id' => 1], $request->validated());

        return $intro;
    }
}