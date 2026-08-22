<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\EraResource;
use App\Models\Era;

class EraController extends Controller  
{
    public function index()
    {
        $eras = Era::orderBy('order')->get();

        return EraResource::collection($eras);
    }
}