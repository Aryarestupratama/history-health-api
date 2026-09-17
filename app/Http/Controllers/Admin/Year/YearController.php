<?php

namespace App\Http\Controllers\Admin\Year;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Year\AssignVaccinesRequest;
use App\Http\Requests\Admin\Year\StoreYearRequest;
use App\Http\Requests\Admin\Year\UpdateYearRequest;
use App\Models\Year;
use Illuminate\Http\Request;

class YearController extends Controller
{
    public function index(Request $request)
    {
        $query = Year::query()
            ->with([
                'quiz:id,year_id,is_published',
                // (Baru) Rangkuman Interaktif — sama pola eager-load dengan
                // 'quiz' di atas, dipakai admin panel buat nampilin badge
                // status publish rangkuman di list year (mis. warna beda
                // kalau belum publish), tanpa perlu request terpisah per row.
                'summary:id,year_id,is_published',
            ])
            ->orderBy('year');

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
        return $year->load(['sections', 'vaccines', 'quiz', 'summary']);
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

    /**
     * CMS-05: assign satu/lebih vaksin ke year ini (many-to-many via year_vaccine).
     * Pakai sync(), bukan attach() — submit ulang form multi-select akan
     * menyamakan isi relasi persis dengan yang dikirim (termasuk unassign
     * vaccine yang di-uncheck admin), bukan menumpuk duplikat pivot row.
     */
    public function assignVaccines(AssignVaccinesRequest $request, Year $year)
    {
        $year->vaccines()->sync($request->validated()['vaccine_ids']);

        return $year->load('vaccines');
    }
}