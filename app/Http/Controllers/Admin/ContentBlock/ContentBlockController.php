<?php

namespace App\Http\Controllers\Admin\ContentBlock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ContentBlock\ReorderContentBlockRequest;
use App\Http\Requests\Admin\ContentBlock\StoreContentBlockRequest;
use App\Http\Requests\Admin\ContentBlock\UpdateContentBlockRequest;
use App\Models\ContentBlock;
use App\Models\Section;

class ContentBlockController extends Controller
{
    public function index(Section $section)
    {
        return $section->contentBlocks;
    }

    public function store(StoreContentBlockRequest $request, Section $section)
    {
        // SectionOrderingService dihapus (tipe blok `summary` sudah tidak ada,
        // rangkuman sekarang di years.summary — lihat Rules.md R-YEAR-01).
        // Urutan blok baru sekarang murni "tambahkan di akhir".
        $nextOrder = (int) $section->contentBlocks()->max('order') + 1;

        $data = $request->validated();

        // FIX: StoreContentBlockRequest sengaja bikin 'content' nullable,
        // karena WabahWorkspace.jsx (addBlock()) membuat block skeleton dulu
        // dengan content: "" sebelum diisi via updateBlock() (PATCH). Tapi
        // Laravel punya middleware bawaan ConvertEmptyStringsToNull yang
        // mengubah "" jadi null SEBELUM validasi -> lolos rule 'nullable',
        // namun kolom `content` di DB (migration content_blocks) NOT NULL
        // tanpa default -> insert null gagal dengan
        // "SQLSTATE[23000]: Column 'content' cannot be null".
        // Di-coerce balik ke string kosong di sini, tanpa perlu migration
        // baru untuk mengubah kolom jadi nullable di DB.
        $data['content'] = $data['content'] ?? '';

        $block = $section->contentBlocks()->create([
            ...$data,
            'order' => $nextOrder,
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
     * Reorder blok via drag-drop (R-CMS-02). Urutan final ditentukan murni
     * oleh urutan `block_ids` yang dikirim klien — tidak ada lagi logic
     * "paksa summary ke akhir" karena tipe blok summary sudah dihapus.
     */
    public function reorder(ReorderContentBlockRequest $request, Section $section)
    {
        $blockIds = $request->input('block_ids');

        // Guard: pastikan semua id yang dikirim benar-benar milik section ini,
        // bukan section lain (mencegah user memindahkan blok lintas section).
        $ownedIds = $section->contentBlocks()->pluck('id');
        abort_unless(
            collect($blockIds)->diff($ownedIds)->isEmpty(),
            422,
            'Terdapat block_ids yang bukan milik section ini.'
        );

        foreach ($blockIds as $index => $id) {
            ContentBlock::whereKey($id)->update(['order' => $index + 1]);
        }

        return response()->json(
            $section->contentBlocks()->orderBy('order')->get()->values()
        );
    }
}