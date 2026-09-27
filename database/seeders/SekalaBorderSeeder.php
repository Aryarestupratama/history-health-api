<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder singleton `sekala_borders` -- pola SAMA PERSIS dengan
 * `WabahIntroSeeder` (`updateOrCreate` id=1, aman dipanggil ulang lewat
 * `migrate:fresh --seed` tanpa duplikat row).
 *
 * `image_link` masih placeholder -- GANTI dengan link Google Drive asli
 * dari tim desain sebelum publish beneran (sama catatan yang dulu berlaku
 * untuk `WabahIntroSeeder`, lihat progress.md).
 */
class SekalaBorderSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('sekala_borders')->updateOrInsert(
            ['id' => 1],
            [
                'image_link' => null, // TODO: isi link Drive asli tim desain
                'is_published' => false,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
    }
}