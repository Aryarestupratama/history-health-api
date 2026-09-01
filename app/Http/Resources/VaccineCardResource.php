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
            // sekalipun tetap akan ditolak 404 sampai unlock), nama disamarkan.
            // photo_url SENGAJA tidak dikirim (null) selagi masih locked —
            // kalau foto asli ikut terkirim di sini, user bisa buka URL-nya
            // langsung dan lihat sebelum benar-benar unlock (spoiler leak).
            // Hanya photo_locked_url (siluet) yang diekspos; Flutter simpan
            // ini sebagai starting frame untuk animasi crossfade nanti saat
            // vaksin ini unlock (R-VAC-04).
            return [
                'id' => $this->id,
                'name' => '???',
                'photo_url' => null,
                'photo_locked_url' => $this->photo_locked_url,
                'unlocked' => false,
            ];
        }

        // Unlocked: foto asli boleh dikirim penuh. photo_locked_url tetap
        // disertakan (bukan wajib dipakai) — berguna kalau Flutter mau
        // replay animasi reveal dari cache lokal tanpa fetch ulang state lama.
        return [
            'id' => $this->id,
            'name' => $this->name,
            'photo_url' => $this->photo_url,
            'photo_locked_url' => $this->photo_locked_url,
            'unlocked' => true,
        ];
    }
}