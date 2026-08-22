<?php

namespace App\Http\Controllers\Admin\Figure;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Figure\StoreFigureRequest;
use App\Http\Requests\Admin\Figure\UpdateFigureRequest;
use App\Models\Figure;

class FigureController extends Controller
{
    public function index()
    {
        return Figure::orderBy('name')->get();
    }

    public function store(StoreFigureRequest $request)
    {
        $figure = Figure::create($request->validated());

        return response()->json($figure, 201);
    }

    public function show(Figure $figure)
    {
        return $figure->load('sections');
    }

    public function update(UpdateFigureRequest $request, Figure $figure)
    {
        $figure->update($request->validated());

        return $figure;
    }

    public function destroy(Figure $figure)
    {
        $figure->delete();

        return response()->json(null, 204);
    }
}