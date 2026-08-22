<?php

namespace Database\Seeders;

use App\Models\Era;
use Illuminate\Database\Seeder;

class EraSeeder extends Seeder
{
    public function run(): void
    {
        $eras = [
            [
                'name' => 'Kolonial',
                'slug' => 'kolonial',
                'description' => 'Masa kesehatan Indonesia di era penjajahan Belanda dan Jepang.',
                'order' => 1,
            ],
            [
                'name' => 'Kemerdekaan',
                'slug' => 'kemerdekaan',
                'description' => 'Masa awal kemerdekaan hingga masa Orde Baru.',
                'order' => 2,
            ],
            [
                'name' => 'Modern',
                'slug' => 'modern',
                'description' => 'Masa reformasi hingga era kesehatan digital saat ini.',
                'order' => 3,
            ],
        ];

        foreach ($eras as $era) {
            Era::updateOrCreate(['slug' => $era['slug']], $era);
        }
    }
}