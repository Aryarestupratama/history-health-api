<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestUserSeeder extends Seeder
{
    /**
     * User verified khusus untuk testing manual (curl/tinker) — terutama
     * skenario sequential section unlock (R-SECT-01–04) yang butuh user
     * login dengan email_verified_at terisi (bukan admin, bukan guest).
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'role' => 'user',
            ]
        );
    }
}