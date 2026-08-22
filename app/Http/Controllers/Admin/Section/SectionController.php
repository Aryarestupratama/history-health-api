<?php

namespace App\Http\Controllers\Admin\Section;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Section\StoreSectionRequest;
use App\Http\Requests\Admin\Section\UpdateSectionRequest;
use App\Http\Requests\Admin\Figure\AssignFiguresRequest;
use App\Models\Section;
use App\Services\Content\SectionOrderingService;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    public function __construct(
        protected SectionOrderingService $ordering
    ) {}

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
        $section = Section::create([
            ...$request->validated(),
            'is_published' => false, // selalu draft saat dibuat (R-ADMIN-03)
        ]);

        return response()->json($section, 201);
    }

    public function show(Section $section)
    {
        return $section->load(['contentBlocks', 'figures', 'year.era']);
    }

    public function update(UpdateSectionRequest $request, Section $section)
    {
        $data = $request->validated();

        // R-CMS-04: jika admin mencoba publish, cek dulu ada blok summary
        if (($data['is_published'] ?? false) === true && !$section->is_published) {
            $message = $this->ordering->publishValidationMessage($section);

            if ($message) {
                return response()->json(['message' => $message], 422);
            }
        }

        $section->update($data);

        return $section;
    }

    public function destroy(Section $section)
    {
        $section->delete();

        return response()->json(null, 204);
    }

    public function assignFigures(AssignFiguresRequest $request, Section $section)
    {
        $section->figures()->sync($request->input('figure_ids'));

        return $section->load('figures');
    }
}