<?php

namespace Database\Seeders;

use App\Models\Section;
use App\Models\Year;
use Illuminate\Database\Seeder;

class SectionSeeder extends Seeder
{
    /**
     * Catatan: section & vaccine untuk year 2020 (COVID) TIDAK lagi
     * di-handle di sini — sudah dipindah seluruhnya ke ModernDummySeeder
     * (data real) supaya tidak ada dua seeder yang saling menimpa year
     * yang sama.
     */
    public function run(): void
    {
        $year1918 = Year::where('year', 1918)->first();

        $year1918->update([
            'summary' => 'Wabah Flu Spanyol tahun 1918 menjadi salah satu pandemi paling mematikan yang pernah tercatat di Hindia Belanda, menewaskan ratusan ribu jiwa dan mengubah pendekatan sanitasi serta layanan kesehatan kolonial pada masa itu.',
        ]);

        $section1918 = Section::updateOrCreate(
            ['year_id' => $year1918->id, 'title' => 'Flu Spanyol di Hindia Belanda'],
            [
                'order' => 1,
                'is_published' => true,
            ]
        );

        $section1918->contentBlocks()->delete();
        $section1918->contentBlocks()->createMany([
            [
                'type' => 'text',
                'content' => 'Wabah Flu Spanyol melanda dunia pada tahun 1918, termasuk Hindia Belanda...',
                'order' => 1,
            ],
            [
                'type' => 'image',
                'content' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_1918/view',
                'order' => 2,
            ],
            [
                'type' => 'video',
                'content' => 'https://www.youtube.com/watch?v=CONTOH_VIDEO_ID',
                'order' => 3,
            ],
        ]);

        // Section kedua di year 1918 (order 2) — sengaja ditambahkan untuk
        // menguji sequential unlock (R-SECT-01/02/03): guest & user yang
        // belum menyelesaikan section pertama harus terkunci di sini.
        $section1918b = Section::updateOrCreate(
            ['year_id' => $year1918->id, 'title' => 'Dampak Flu Spanyol pada Layanan Kesehatan Kolonial'],
            [
                'order' => 2,
                'is_published' => true,
            ]
        );

        $section1918b->contentBlocks()->delete();
        $section1918b->contentBlocks()->createMany([
            [
                'type' => 'text',
                'content' => 'Pasca gelombang awal wabah, pemerintah kolonial mulai membenahi sistem sanitasi dan layanan kesehatan publik...',
                'order' => 1,
            ],
            [
                'type' => 'image',
                'content' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_1918B/view',
                'order' => 2,
            ],
        ]);
    }
}