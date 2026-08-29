<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VaccineCardResource extends JsonResource
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
            // Siluet: id tetap dikirim (dibutuhkan untuk GET /cards/{vaccine}
            // sekalipun tetap akan ditolak 404 sampai unlock), nama & foto
            // disamarkan (R-VAC-04 — tetap muncul di list, tidak disembunyikan).
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