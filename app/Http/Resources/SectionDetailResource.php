<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SectionDetailResource extends JsonResource
{
    private ?bool $isLocked = null;

    /**
     * Set status lock section ini untuk user yang sedang request (R-SECT-04).
     * Dipanggil dari controller setelah cek via SectionAccessService.
     * Untuk guest / endpoint publik, cukup jangan panggil ini — 'locked'
     * akan null (tidak relevan, karena guest hanya pernah diberi section
     * pertama yang published, lihat R-SECT-03).
     */
    public function withLockStatus(bool $isLocked): static
    {
        $this->isLocked = $isLocked;

        return $this;
    }

    public function toArray(Request $request): array
    {
        // Section terkunci: kembalikan response terbatas, tanpa content_blocks
        // maupun daftar figures/vaccine terkait (R-SECT-04).
        if ($this->isLocked === true) {
            return [
                'id' => $this->id,
                'title' => $this->title,
                'order' => $this->order,
                'locked' => true,
                'year' => $this->yearSummaryArray(),
            ];
        }

        return [
            'id' => $this->id,
            // `title` dipertahankan di response (dipakai admin/label internal),
            // tapi Flutter TIDAK LAGI merender ini sebagai judul di layar
            // Detail Section — posisi paling atas digantikan `header_image_url`
            // (opsional, null kalau section ini tidak diisi header gambar).
            'title' => $this->title,
            // (Baru) Header gambar section — opsional per section (bisa ada,
            // bisa tidak). Sudah di-resolve ke direct-view URL lewat accessor
            // model (Section::getResolvedHeaderImageUrlAttribute()).
            'header_image_url' => $this->resolved_header_image_url,
            'order' => $this->order,
            'locked' => false,
            'year' => $this->yearSummaryArray(),
            'content_blocks' => ContentBlockResource::collection(
                $this->contentBlocks->sortBy('order')->values()
            ),
            // nama vaksin terkait saja — detail lengkap (foto, produsen, dll)
            // hanya dibuka lewat endpoint collectible card setelah unlock.
            // Catatan: relasi vaksin sekarang ada di level `year`, bukan
            // `section` lagi — diambil dari $this->year->vaccines.
            'vaccines' => $this->year->vaccines->map(fn ($v) => [
                'id' => $v->id,
                'name' => $v->name,
            ]),
        ];
    }

    private function yearSummaryArray(): array
    {
        return [
            'id' => $this->year->id,
            'year' => $this->year->year,
            'title' => $this->year->title,
            'era' => [
                'id' => $this->year->era->id,
                'name' => $this->year->era->name,
                'slug' => $this->year->era->slug,
            ],
        ];
    }
}