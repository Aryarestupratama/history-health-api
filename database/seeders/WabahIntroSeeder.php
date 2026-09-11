<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\WabahIntro;

/**
 * Seeder untuk tabel singleton wabah_intro.
 *
 * Selalu 1 row (updateOrCreate by id=1) — dijalankan berkali-kali aman,
 * tidak akan membuat row duplikat kalau seeder di-run ulang.
 *
 * TODO: image_link masih placeholder, ganti dengan link Google Drive
 * infografis asli dari tim konten sebelum dianggap final/siap publish.
 */
class WabahIntroSeeder extends Seeder
{
    public function run(): void
    {
        WabahIntro::updateOrCreate(
            ['id' => 1],
            [
                'image_link' => '[Placeholder — link Google Drive infografis "Apa itu Wabah"]',
                'caption' => 'Wabah adalah kejadian munculnya suatu penyakit menular yang menyebar dengan cepat dan meluas di suatu wilayah dalam kurun waktu tertentu, sering kali melampaui perkiraan normal.',
                'is_published' => true,
            ]
        );
    }
}