<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class YearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'year' => $this->year,
            'title' => $this->title,
            // Section published yang sudah di-eager-load oleh
            // YearController::index (relasi 'sections') — dipakai Flutter
            // untuk navigasi roadmap -> detail section tanpa request
            // tambahan per tahun.
            'sections' => $this->whenLoaded('sections', fn () => $this->sections->map(
                fn ($section) => [
                    'id' => $section->id,
                    'title' => $section->title,
                ]
            )),
            // Diturunkan dari koleksi yang sama (bukan query count terpisah
            // lagi) sekarang relasi 'sections' selalu di-load oleh controller.
            'published_sections_count' => $this->whenLoaded(
                'sections',
                fn () => $this->sections->count()
            ),
        ];
    }
}