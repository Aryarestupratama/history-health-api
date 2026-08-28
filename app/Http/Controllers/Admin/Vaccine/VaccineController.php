<?php

namespace App\Http\Controllers\Admin\Vaccine;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Vaccine\StoreVaccineRequest;
use App\Http\Requests\Admin\Vaccine\UpdateVaccineRequest;
use App\Models\Vaccine;

class VaccineController extends Controller
{
    public function index()
    {
        return Vaccine::query()->latest()->get();
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
}