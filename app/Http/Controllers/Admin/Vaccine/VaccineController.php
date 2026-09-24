<?php

namespace App\Http\Controllers\Admin\Vaccine;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Vaccine\AssignVaccineYearsRequest;
use App\Http\Requests\Admin\Vaccine\StoreVaccineRequest;
use App\Http\Requests\Admin\Vaccine\UpdateVaccineRequest;
use App\Models\Vaccine;

class VaccineController extends Controller
{
    public function index()
    {
        // Eager-load years supaya VaccineManager.jsx (tabel + form assign
        // year) tidak perlu request show() terpisah tiap buka form edit —
        // dipakai juga untuk menampilkan kolom "Tahun (Wabah)" di tabel.
        return Vaccine::with('years')->latest()->get();
    }

    public function store(StoreVaccineRequest $request)
    {
        $vaccine = Vaccine::create($request->validated());

        return response()->json($vaccine, 201);
    }

    public function show(Vaccine $vaccine)
    {
        return $vaccine->load('years');
    }

    public function update(UpdateVaccineRequest $request, Vaccine $vaccine)
    {
        $vaccine->update($request->validated());

        return $vaccine;
    }

    public function destroy(Vaccine $vaccine)
    {
        $vaccine->delete();

        return response()->json(null, 204);
    }

    /**
     * Kebalikan dari YearController::assignVaccines() — assign year(s) dari
     * sisi vaksin (VaccineManager.jsx), supaya admin tidak wajib buka
     * WabahWorkspace per-tahun cuma untuk menghubungkan satu vaksin ke
     * beberapa tahun sekaligus (CMS-05, relasi many-to-many year <-> vaccine
     * tetap sama, cuma entry point-nya ditambah).
     *
     * sync() dipakai (bukan attach/toggle) — payload year_ids selalu jadi
     * source of truth relasi vaksin ini, konsisten dengan pola
     * assignVaccines() di YearController.
     */
    public function assignYears(AssignVaccineYearsRequest $request, Vaccine $vaccine)
    {
        $vaccine->years()->sync($request->validated('year_ids'));

        return response()->json($vaccine->load('years'));
    }
}