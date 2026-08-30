<?php

namespace App\Http\Controllers\Admin\AdminUser;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminUser\StoreAdminUserRequest;
use App\Http\Requests\Admin\AdminUser\UpdateAdminUserRequest;
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

    public function update(UpdateAdminUserRequest $request, User $admin)
    {
        $this->ensureIsAdmin($admin);

        $data = $request->validated();

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
        ];

        // Password opsional saat update -- kosongkan di form berarti tidak diubah.
        if (! empty($data['password'])) {
            $payload['password'] = Hash::make($data['password']);
        }

        $admin->update($payload);

        return $admin->only(self::VISIBLE_FIELDS);
    }

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