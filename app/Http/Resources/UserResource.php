<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'is_email_verified' => ! is_null($this->email_verified_at),
            // Fase 3 — Foto Profil & Border SEKALA. avatar_url null kalau
            // belum pernah upload (Flutter fallback inisial/placeholder).
            'avatar_url' => $this->avatar_url,
            // frame_unlocked: status PERMANEN (lihat User::hasFrameUnlocked()),
            // tidak pernah kembali false walau admin menambah year baru.
            'frame_unlocked' => $this->hasFrameUnlocked(),
            'frame_unlocked_at' => $this->frame_unlocked_at,
            // frame_equipped hanya bermakna kalau frame_unlocked true —
            // Flutter tetap terima apa adanya (false secara default),
            // toggle pasang/lepas cuma boleh diaktifkan kalau unlocked.
            'frame_equipped' => (bool) $this->frame_equipped,
            // Status "sudah lihat tutorial onboarding" level akun — dibaca
            // TutorialTourController (Flutter) untuk user login, MENGGANTIKAN
            // flag SharedPreferences murni-lokal (yang salah asumsi: per
            // device, bukan per akun). Guest tetap pakai flag lokal karena
            // guest tidak punya row users.
            'has_seen_onboarding_tutorial' => (bool) $this->has_seen_onboarding_tutorial,
        ];
    }
}