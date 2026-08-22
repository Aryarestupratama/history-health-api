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
            // jumlah section published dalam tahun ini, berguna buat Flutter
            // menampilkan tahun mana yang punya konten tanpa fetch tambahan
            'published_sections_count' => $this->whenCounted('sections'),
        ];
    }
}