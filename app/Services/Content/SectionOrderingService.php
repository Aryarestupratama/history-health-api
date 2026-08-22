<?php

namespace App\Services\Content;

use App\Models\ContentBlock;
use App\Models\Section;
use Illuminate\Support\Collection;

class SectionOrderingService
{
    /**
     * R-CMS-03: Blok bertipe 'summary' harus selalu berada di order tertinggi/terakhir.
     * Dipanggil saat admin menyimpan urutan blok (reorder drag-drop).
     *
     * Menerima array urutan blok baru, mis:
     * [['id' => 3, 'order' => 1], ['id' => 1, 'order' => 2], ['id' => 5, 'order' => 3]]
     *
     * Method ini menormalisasi urutan tsb: jika ada blok 'summary' di tengah,
     * otomatis dipindah ke order paling akhir sebelum disimpan.
     *
     * @return Collection Urutan final yang sudah dinormalisasi, siap disimpan.
     */
    public function normalizeOrder(Section $section, array $orderedBlockIds): Collection
    {
        $blocks = $section->contentBlocks()
            ->whereIn('id', $orderedBlockIds)
            ->get()
            ->keyBy('id');

        // Susun ulang berdasarkan urutan yang dikirim admin
        $sorted = collect($orderedBlockIds)
            ->map(fn ($id) => $blocks->get($id))
            ->filter();

        // Pisahkan summary dari non-summary
        $nonSummary = $sorted->filter(fn ($block) => $block->type !== 'summary')->values();
        $summary = $sorted->filter(fn ($block) => $block->type === 'summary')->values();

        // Gabungkan lagi: non-summary dulu, summary selalu di akhir
        $final = $nonSummary->concat($summary)->values();

        // Assign order integer 1..n
        return $final->map(function ($block, $index) {
            $block->order = $index + 1;

            return $block;
        });
    }

    /**
     * Simpan hasil normalisasi ke database.
     */
    public function saveOrder(Section $section, array $orderedBlockIds): Collection
    {
        $normalized = $this->normalizeOrder($section, $orderedBlockIds);

        foreach ($normalized as $block) {
            $block->save();
        }

        return $normalized;
    }

    /**
     * R-CMS-04: Section minimal harus punya satu blok 'summary'
     * sebelum bisa di-set is_published = true.
     */
    public function canPublish(Section $section): bool
    {
        return $section->contentBlocks()->where('type', 'summary')->exists();
    }

    /**
     * Helper untuk dipakai di Form Request / Controller saat admin
     * mencoba publish — return pesan error kalau belum bisa.
     */
    public function publishValidationMessage(Section $section): ?string
    {
        if (!$this->canPublish($section)) {
            return 'Section harus memiliki minimal satu blok rangkuman (summary) sebelum dapat dipublish.';
        }

        return null;
    }

    /**
     * Dipanggil setiap kali blok baru ditambahkan.
     * Jika tipe baru adalah 'summary' dan sudah ada block lain,
     * pastikan order-nya otomatis jadi paling akhir.
     */
    public function nextOrderForNewBlock(Section $section, string $type): int
    {
        $existingBlocks = $section->contentBlocks;

        if ($existingBlocks->isEmpty()) {
            return 1;
        }

        $summaryBlock = $existingBlocks->firstWhere('type', 'summary');

        if ($type === 'summary') {
            // Summary baru akan menggantikan posisi akhir
            return $existingBlocks->max('order') + 1;
        }

        if ($summaryBlock) {
            // Ada summary existing — sisipkan block baru SEBELUM summary,
            // geser order summary ke +1
            $summaryBlock->increment('order');

            return $summaryBlock->order - 1;
        }

        return $existingBlocks->max('order') + 1;
    }
}