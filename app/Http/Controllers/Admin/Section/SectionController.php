<?php

namespace App\Http\Controllers\Admin\Section;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Section\StoreSectionRequest;
use App\Http\Requests\Admin\Section\UpdateSectionRequest;
use App\Models\Section;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    public function index(Request $request)
    {
        $query = Section::query()->with('year');

        if ($request->filled('year_id')) {
            $query->where('year_id', $request->input('year_id'));
        }

        // Admin bisa lihat draft & published (R-ADMIN-03), tidak pakai scopePublished
        return $query->get();
    }

    public function store(StoreSectionRequest $request)
    {
        $data = $request->validated();

        // R-SECT-01: sequential unlock bergantung pada `order`. Jika admin
        // tidak mengisi manual, auto-assign urutan berikutnya dalam year tsb.
        $data['order'] ??= Section::where('year_id', $data['year_id'])->max('order') + 1;

        $section = Section::create([
            ...$data,
            'is_published' => false, // selalu draft saat dibuat (R-ADMIN-03)
        ]);

        return response()->json($section, 201);
    }

    public function show(Section $section)
    {
        // R-SECT-05: admin selalu bisa melihat seluruh section apa pun status lock-nya.
        return $section->load(['contentBlocks', 'year.era']);
    }

    public function update(UpdateSectionRequest $request, Section $section)
    {
        // Tidak ada lagi syarat blok `summary` sebelum publish (R-CMS-03/04
        // sudah dihapus). Publish section kini murni toggle is_published.
        $section->update($request->validated());

        return $section;
    }

    public function destroy(Section $section)
    {
        $section->delete();

        return response()->json(null, 204);
    }
}