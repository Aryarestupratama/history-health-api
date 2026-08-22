<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * Kirim ulang email verifikasi.
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
     * Laravel otomatis validasi signature + expiry link via EmailVerificationRequest.
     */
    public function verify(EmailVerificationRequest $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email sudah terverifikasi sebelumnya.',
            ]);
        }

        $request->fulfill();

        return response()->json([
            'message' => 'Email berhasil diverifikasi.',
        ]);
    }
}