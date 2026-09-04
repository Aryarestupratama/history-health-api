<?php

namespace App\Http\Resources;

use App\Models\UserVaccineUnlock;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VaccineCardResource extends JsonResource
{
    private ?UserVaccineUnlock $unlock = null;

    /**
     * @param  UserVaccineUnlock|null  $unlock  null = belum unlock (siluet).
     *   Diberikan seluruh model (bukan cuma bool) supaya resource ini juga
     *   bisa turunkan status `unseen` dari `seen_at`, dipakai buat badge dot
     *   bottom nav & nentuin vaksin mana yang masih dapat animasi reveal
     *   locked->unlocked di halaman Koleksi.
     */
    public function withUnlock(?UserVaccineUnlock $unlock): static
    {
        $this->unlock = $unlock;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $isUnlocked = $this->unlock !== null;

        if (! $isUnlocked) {
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
                'unseen' => false,
            ];
        }

        // Unlocked: foto asli boleh dikirim penuh. photo_locked_url tetap
        // disertakan (bukan wajib dipakai) — berguna kalau Flutter mau
        // replay animasi reveal dari cache lokal tanpa fetch ulang state lama.
        // `unseen` = belum pernah dibuka user di Koleksi (seen_at masih
        // null) — jadi Flutter tahu vaksin ini masih perlu diputar animasi
        // reveal-nya & badge dot masih harus tampil.
        return [
            'id' => $this->id,
            'name' => $this->name,
            'photo_url' => $this->photo_url,
            'photo_locked_url' => $this->photo_locked_url,
            'unlocked' => true,
            'unseen' => $this->unlock->seen_at === null,
        ];
    }
}