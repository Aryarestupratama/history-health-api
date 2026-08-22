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
            ->withCount(['sections' => fn ($q) => $q->published()])
            ->orderBy('year') // kronologis, bukan urutan input admin
            ->get();

        return YearResource::collection($years);
    }
}