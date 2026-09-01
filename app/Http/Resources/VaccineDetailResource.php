<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VaccineDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'photo_url' => $this->photo_url,
            'photo_locked_url' => $this->photo_locked_url,
            'manufacturer' => $this->manufacturer,
            'disease_target' => $this->disease_target,
            'year_introduced' => $this->year_introduced,
            'description' => $this->description,
        ];
    }
}