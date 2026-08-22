<?php

namespace App\Services\Auth;

use App\Models\User;
use Laravel\Socialite\Contracts\User as SocialiteUser;

class GoogleAuthService
{
    /**
     * R-AUTH-04: Google OAuth otomatis terverifikasi.
     * R-AUTH-05: kalau email sudah ada (akun manual), link ke google_id, bukan bikin user baru.
     */
    public function findOrCreateUser(SocialiteUser $googleUser): User
    {
        $user = User::where('email', $googleUser->getEmail())->first();

        if ($user) {
            if (! $user->google_id) {
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ]);
            }

            return $user;
        }

        return User::create([
            'name' => $googleUser->getName(),
            'email' => $googleUser->getEmail(),
            'google_id' => $googleUser->getId(),
            'password' => null,
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
    }

    public function issueToken(User $user): string
    {
        return $user->createToken('auth_token', ['*'], null)->plainTextToken;
    }
}