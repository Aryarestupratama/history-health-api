<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            TestUserSeeder::class,
            EraSeeder::class,
            YearSeeder::class,
            SectionSeeder::class,
            VaccineSeeder::class,
            QuizSeeder::class,
            KolonialDummySeeder::class,
            ModernDummySeeder::class,
        ]);
    }
}