<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FigureDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'photo_url' => $this->photo_url,
            'birth_date' => $this->birth_date?->toDateString(),
            'death_date' => $this->death_date?->toDateString(),
            'family' => $this->family,
            'role_description' => $this->role_description,
        ];
    }
}