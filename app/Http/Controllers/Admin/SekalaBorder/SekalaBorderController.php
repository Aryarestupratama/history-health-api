<?php

namespace App\Http\Controllers\Admin\SekalaBorder;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SekalaBorder\UpdateSekalaBorderRequest;
use App\Models\SekalaBorder;

/**
 * Pola sama persis `WabahIntroController` — `sekala_borders` singleton
 * (selalu 1 row, id=1), jadi sengaja tidak ada index()/store()/destroy().
 * Admin hanya melihat & mengedit satu aset border yang sama, tidak pernah
 * membuat/menghapus "item" baru.
 */
class SekalaBorderController extends Controller
{
    public function show()
    {
        // new SekalaBorder() (bukan 404) kalau belum pernah diisi sama
        // sekali — supaya form admin tetap bisa dibuka kosong untuk
        // pengisian pertama kali, bukan error.
        return SekalaBorder::current() ?? new SekalaBorder();
    }

    public function update(UpdateSekalaBorderRequest $request)
    {
        $border = SekalaBorder::updateOrCreate(['id' => 1], $request->validated());

        return $border;
    }
}