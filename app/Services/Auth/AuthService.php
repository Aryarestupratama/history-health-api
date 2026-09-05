<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * R-AUTH-01, R-AUTH-02: registrasi manual, status belum terverifikasi.
     */
    public function register(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'user',
        ]);

        event(new Registered($user));

        return $user;
    }

    /**
     * R-AUTH-06: token dibuat tanpa expiry (session panjang / remember-me).
     */
    public function login(array $credentials): array
    {
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! $user->password || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        $token = $user->createToken('auth_token', ['*'], null)->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        // User Google OAuth murni (password null) tidak boleh lewat jalur ini —
        // R-AUTH-05 (akun ter-link Google TAPI juga punya password manual boleh,
        // dicek via password !== null, bukan google_id !== null).
        if ($user->password === null) {
            throw ValidationException::withMessages([
                'current_password' => ['Akun ini login via Google dan belum punya password. Fitur ganti password belum tersedia untuk kasus ini.'],
            ]);
        }

        if (! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password saat ini tidak sesuai.'],
            ]);
        }

        $user->forceFill(['password' => Hash::make($newPassword)])->save();

        // Cabut semua token lama (Sanctum) kecuali token yang lagi dipakai
        // request ini sekarang — mirip pola umum "logout dari device lain"
        // setelah ganti password demi keamanan.
        $currentTokenId = $user->currentAccessToken()?->id;
        $user->tokens()
            ->when($currentTokenId, fn ($q) => $q->where('id', '!=', $currentTokenId))
            ->delete();
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }
}