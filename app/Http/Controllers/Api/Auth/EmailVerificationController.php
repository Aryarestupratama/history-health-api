<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * Kirim ulang email verifikasi. Tetap butuh auth:sanctum (user harus
     * login dulu buat minta kirim ulang) — ini nggak berubah.
     */
    public function resend(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email sudah terverifikasi.',
            ]);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Link verifikasi telah dikirim ulang ke email kamu.',
        ]);
    }

    /**
     * Verifikasi email lewat link yang diklik user.
     *
     * SENGAJA nggak pakai `auth:sanctum` middleware ataupun
     * EmailVerificationRequest bawaan Laravel — dua-duanya butuh sesi/token
     * user yang AKTIF pas link diklik. Padahal link ini dibuka dari email
     * client / browser polos (Chrome dari luar app), yang nggak pernah
     * bisa nempelin Bearer token. Keamanan tetap terjaga lewat:
     * 1. Middleware 'signed' (cek signature URL belum di-tamper/expired)
     * 2. Validasi hash manual di bawah (cocokkan {hash} dengan email user)
     */
    public function verify(Request $request, int $id, string $hash): JsonResponse
    {
        $user = User::findOrFail($id);

        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            abort(403, 'Link verifikasi tidak valid.');
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email sudah terverifikasi sebelumnya.',
            ]);
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return response()->json([
            'message' => 'Email berhasil diverifikasi.',
        ]);
    }
}