<?php

namespace App\Http\Controllers\Admin\AdminUser;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminUser\StoreAdminUserRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    private const VISIBLE_FIELDS = ['id', 'name', 'email', 'created_at'];

    public function index()
    {
        return User::query()
            ->where('role', 'admin')
            ->latest()
            ->get(self::VISIBLE_FIELDS);
    }

    public function store(StoreAdminUserRequest $request)
    {
        $admin = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => Hash::make($request->validated('password')),
            'role' => 'admin',
            // Admin dibuat langsung oleh admin lain (bukan self-register via
            // /auth/register), jadi dianggap terverifikasi sejak awal --
            // selaras pola R-AUTH-04 (Google OAuth juga auto-verified).
            'email_verified_at' => now(),
        ]);

        return response()->json($admin->only(self::VISIBLE_FIELDS), 201);
    }

    // NOTE (revisi): update() dicabut total -- Kelola Admin sekarang cuma
    // Tambah/Hapus. Ganti nama/email/password akun sendiri pindah ke menu
    // Profil (lihat ProfileController/AuthController::changePassword),
    // admin lain tidak lagi bisa mengedit data admin manapun lewat sini.
    // UpdateAdminUserRequest juga sudah tidak dipakai -- boleh dihapus dari
    // app/Http/Requests/Admin/AdminUser/ kalau tidak dipakai di tempat lain.

    public function destroy(Request $request, User $admin)
    {
        $this->ensureIsAdmin($admin);

        if ($request->user()->id === $admin->id) {
            return response()->json([
                'message' => 'Tidak bisa menghapus akun sendiri.',
            ], 422);
        }

        if (User::where('role', 'admin')->count() <= 1) {
            return response()->json([
                'message' => 'Tidak bisa menghapus admin terakhir yang tersisa di sistem.',
            ], 422);
        }

        $admin->delete();

        return response()->json(null, 204);
    }

    /**
     * Route model binding {admin} bisa saja resolve ke user dengan role
     * 'user' kalau ID-nya asal ditebak -- pastikan tetap 404 supaya
     * endpoint ini benar-benar hanya beroperasi pada akun admin.
     */
    private function ensureIsAdmin(User $user): void
    {
        abort_unless($user->role === 'admin', 404);
    }
}