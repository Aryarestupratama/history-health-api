<?php

namespace App\Http\Controllers\Admin\Era;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Era\StoreEraRequest;
use App\Http\Requests\Admin\Era\UpdateEraRequest;
use App\Models\Era;

class EraController extends Controller
{
    public function index()
    {
        return Era::orderBy('order')->get();
    }

    public function store(StoreEraRequest $request)
    {
        $era = Era::create($request->validated());

        return response()->json($era, 201);
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