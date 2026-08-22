<?php

namespace Database\Seeders;

use App\Models\Section;
use App\Models\Year;
use Illuminate\Database\Seeder;

class SectionSeeder extends Seeder
{
    public function run(): void
    {
        $year1918 = Year::where('year', 1918)->first();
        $year2020 = Year::where('year', 2020)->first();

        $section1918 = Section::updateOrCreate(
            ['year_id' => $year1918->id, 'title' => 'Flu Spanyol di Hindia Belanda'],
            [
                'quiz_link' => 'https://upresenter.com/quiz/dummy-1918',
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
            [
                'type' => 'summary',
                'content' => 'Rangkuman: Flu Spanyol menjadi salah satu wabah terbesar yang memengaruhi kebijakan kesehatan publik di Hindia Belanda.',
                'order' => 4,
            ],
        ]);

        $section2020 = Section::updateOrCreate(
            ['year_id' => $year2020->id, 'title' => 'Pandemi COVID-19 di Indonesia'],
            [
                'quiz_link' => 'https://upresenter.com/quiz/dummy-2020',
                'is_published' => true,
            ]
        );

        $section2020->contentBlocks()->delete();
        $section2020->contentBlocks()->createMany([
            [
                'type' => 'text',
                'content' => 'Kasus pertama COVID-19 di Indonesia diumumkan pada Maret 2020...',
                'order' => 1,
            ],
            [
                'type' => 'pdf',
                'content' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_PDF/view',
                'order' => 2,
            ],
            [
                'type' => 'summary',
                'content' => 'Rangkuman: Pandemi COVID-19 mengubah banyak aspek kebijakan kesehatan dan kebiasaan masyarakat Indonesia.',
                'order' => 3,
            ],
        ]);
    }
}