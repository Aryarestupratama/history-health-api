<?php

namespace App\Http\Controllers\Admin\Year;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Year\StoreYearRequest;
use App\Http\Requests\Admin\Year\UpdateYearRequest;
use App\Models\Year;
use Illuminate\Http\Request;

class YearController extends Controller
{
    public function index(Request $request)
    {
        $query = Year::query()->orderBy('year');

        if ($request->filled('era_id')) {
            $query->where('era_id', $request->input('era_id'));
        }

        return $query->get();
    }

    public function store(StoreYearRequest $request)
    {
        $year = Year::create($request->validated());

        return response()->json($year, 201);
    }

    public function show(Year $year)
    {
        return $year->load('sections');
    }

    public function update(UpdateYearRequest $request, Year $year)
    {
        $year->update($request->validated());

        return $year;
    }

    public function destroy(Year $year)
    {
        $year->delete();

        return response()->json(null, 204);
    }
}