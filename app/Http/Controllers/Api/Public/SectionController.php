<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\SectionDetailResource;
use App\Models\Section;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SectionController extends Controller
{
    public function show(Section $section)
    {
        // R-CMS-01: section draft tidak boleh diakses non-admin.
        // Karena route ini publik (guest+user biasa, bukan admin),
        // draft section dianggap 404, bukan 403 — supaya tidak bocor
        // informasi bahwa section itu "ada tapi belum publish".
        if (! $section->is_published) {
            throw new NotFoundHttpException();
        }

        $section->load(['contentBlocks', 'figures', 'year.era']);

        return new SectionDetailResource($section);
    }
}