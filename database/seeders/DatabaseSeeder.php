<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            EraSeeder::class,
            ModernSeeder::class,
            QuizSeeder::class,
            KolonialSeeder::class,
            KemerdekaanSeeder::class,
        ]);
    }
}