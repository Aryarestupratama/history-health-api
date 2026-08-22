<?php

namespace App\Http\Controllers\Admin\ContentBlock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ContentBlock\ReorderContentBlockRequest;
use App\Http\Requests\Admin\ContentBlock\StoreContentBlockRequest;
use App\Http\Requests\Admin\ContentBlock\UpdateContentBlockRequest;
use App\Models\ContentBlock;
use App\Models\Section;
use App\Services\Content\SectionOrderingService;

class ContentBlockController extends Controller
{
    public function __construct(
        protected SectionOrderingService $ordering
    ) {}

    public function index(Section $section)
    {
        return $section->contentBlocks;
    }

    public function store(StoreContentBlockRequest $request, Section $section)
    {
        $order = $this->ordering->nextOrderForNewBlock($section, $request->input('type'));

        $block = $section->contentBlocks()->create([
            ...$request->validated(),
            'order' => $order,
        ]);

        return response()->json($block, 201);
    }

    public function update(UpdateContentBlockRequest $request, Section $section, ContentBlock $contentBlock)
    {
        $contentBlock->update($request->validated());

        return $contentBlock;
    }

    public function destroy(Section $section, ContentBlock $contentBlock)
    {
        $contentBlock->delete();

        return response()->json(null, 204);
    }

    /**
     * R-CMS-03: reorder blok via drag-drop, summary otomatis dipaksa ke akhir.
     */
    public function reorder(ReorderContentBlockRequest $request, Section $section)
    {
        $normalized = $this->ordering->saveOrder($section, $request->input('block_ids'));

        return response()->json($normalized->values());
    }
}