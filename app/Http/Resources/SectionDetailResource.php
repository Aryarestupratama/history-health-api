<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SectionDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'year' => [
                'id' => $this->year->id,
                'year' => $this->year->year,
                'title' => $this->year->title,
                'era' => [
                    'id' => $this->year->era->id,
                    'name' => $this->year->era->name,
                    'slug' => $this->year->era->slug,
                ],
            ],
            'quiz_link' => $this->quiz_link, // null → app sembunyikan tombol "Mulai Kuis" (R-CMS-07)
            'content_blocks' => ContentBlockResource::collection(
                $this->contentBlocks->sortBy('order')->values()
            ),
            // nama tokoh terkait saja — detail lengkap (foto, tanggal, dll)
            // hanya dibuka lewat endpoint collectible card setelah unlock
            'figures' => $this->figures->map(fn ($f) => [
                'id' => $f->id,
                'name' => $f->name,
            ]),
        ];
    }
}