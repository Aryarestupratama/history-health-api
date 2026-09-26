<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'google_id',
        'password',
        'role',
        'avatar_path',
        'frame_equipped',
    ];

    // frame_unlocked_at SENGAJA tidak fillable — hanya diisi service unlock
    // border (permanen, satu arah), bukan lewat update biasa/mass-assign.

    // has_seen_onboarding_tutorial SENGAJA tidak fillable juga — hanya
    // diisi lewat markOnboardingTutorialSeen() (satu arah: false -> true),
    // bukan mass-assign biasa. Sama alasan dengan frame_unlocked_at di atas.

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * (Fase 3) `avatar_url` diikutkan otomatis tiap model ini di-serialize
     * — pola sama `CaseStudy::$appends` ('badge_image_url') / Vaccine
     * ('photo_url'), supaya UserResource cukup akses $user->avatar_url.
     */
    protected $appends = ['avatar_url'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'frame_unlocked_at' => 'datetime',
            'frame_equipped' => 'boolean',
            'has_seen_onboarding_tutorial' => 'boolean',
        ];
    }

    /**
     * (Fase 3) Resolve avatar_path (path relatif di disk 'public') jadi URL
     * publik. BEDA dari CaseStudy::badge_image_url/Vaccine::photo_url yang
     * resolve link Google Drive lewat LinkParserService — avatar ini file
     * upload asli di disk hosting, jadi cukup Storage::url(), bukan parser
     * link eksternal. Null kalau user belum pernah upload foto (Flutter
     * fallback ke inisial/placeholder).
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if (blank($this->avatar_path)) {
            return null;
        }

        return Storage::disk('public')->url($this->avatar_path);
    }

    /**
     * (Fase 3) Border SEKALA terbuka permanen sekali `frame_unlocked_at`
     * terisi — helper baca saja, TIDAK menentukan kapan diisi (itu logic
     * service unlock border yang menyusul, dipicu saat studi kasus baru
     * selesai).
     */
    public function hasFrameUnlocked(): bool
    {
        return ! is_null($this->frame_unlocked_at);
    }

    /**
     * Tandai user ini sudah pernah melihat tur tutorial onboarding sampai
     * selesai — dipanggil dari endpoint PATCH profile/tutorial-seen
     * (TutorialTourController Flutter memanggilnya di titik yang SAMA
     * dengan `_markSeen()` lokal sebelumnya, cukup setelah step terakhir
     * kelar). Satu arah (tidak ada "un-mark"), idempotent kalau dipanggil
     * berkali-kali.
     */
    public function markOnboardingTutorialSeen(): void
    {
        if (! $this->has_seen_onboarding_tutorial) {
            $this->forceFill(['has_seen_onboarding_tutorial' => true])->save();
        }
    }

    public function progress()
    {
        return $this->hasMany(UserProgress::class);
    }

    public function vaccineUnlocks()
    {
        return $this->hasMany(UserVaccineUnlock::class);
    }

    public function quizAttempts()
    {
        return $this->hasMany(UserQuizAttempt::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
}