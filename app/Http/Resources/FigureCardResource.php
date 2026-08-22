<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FigureCardResource extends JsonResource
{
    private bool $isUnlocked = false;

    public function withUnlockStatus(bool $isUnlocked): static
    {
        $this->isUnlocked = $isUnlocked;

        return $this;
    }

    public function toArray(Request $request): array
    {
        if (! $this->isUnlocked) {
            // Siluet: id tetap dikirim (dibutuhkan untuk GET /cards/{figure}
            // sekalipun tetap akan ditolak 404 sampai unlock), nama disamarkan.
            return [
                'id' => $this->id,
                'name' => '???',
                'photo_url' => null,
                'unlocked' => false,
            ];
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'photo_url' => $this->photo_url,
            'unlocked' => true,
        ];
    }
}