<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\YearResource;
use App\Models\Era;

class YearController extends Controller
{
    public function index(Era $era)
    {
        // hanya tahun yang punya minimal 1 section published yang ditampilkan
        // (INFO-01: "hanya tahun yang punya data wabah yang ditampilkan")
        $years = $era->years()
            ->whereHas('sections', fn ($q) => $q->published())
            // Eager-load section published-nya sekalian (bukan cuma count)
            // supaya Flutter dapet sectionId buat navigasi ke detail —
            // select id/title/year_id secukupnya (year_id wajib ada, itu
            // FK yang dipakai Eloquent buat nge-hydrate relasinya).
            ->with(['sections' => fn ($q) => $q->published()->select('id', 'title', 'year_id')])
            ->orderBy('year') // kronologis, bukan urutan input admin
            ->get();

        return YearResource::collection($years);
    }
}