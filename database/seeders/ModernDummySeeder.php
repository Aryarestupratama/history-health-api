<?php

namespace Database\Seeders;

use App\Models\Era;
use App\Models\Section;
use App\Models\Vaccine;
use App\Models\Year;
use Illuminate\Database\Seeder;

/**
 * Seeder untuk era Modern.
 *
 * Year 2020 (COVID-19) adalah SATU-SATUNYA year yang complete penuh:
 * 3 section + content blocks (data REAL, termasuk gambar & pedoman
 * pencegahan asli) + vaccine dengan foto locked/unlocked asli + quiz
 * (quiz real sudah di-handle QuizSeeder) + summary.
 *
 * Year 2021–2029 sengaja DUMMY (3 section per year, block acak) — tujuannya
 * murni untuk menguji apakah sequential unlock year bekerja: year 2021 baru
 * boleh terbuka setelah year 2020 (COVID) diselesaikan, dst.
 *
 * Tidak menyentuh SectionSeeder/VaccineSeeder lama untuk year 1918.
 */
class ModernDummySeeder extends Seeder
{
    public function run(): void
    {
        $era = Era::where('slug', 'modern')->first();

        if (!$era) {
            $this->command?->warn('Era "modern" tidak ditemukan, jalankan EraSeeder & YearSeeder dulu.');
            return;
        }

        $this->seedCovidYear($era);
        $this->seedDummyYears($era);

        $this->command?->info('ModernDummySeeder selesai: year COVID (real, complete) + 9 dummy year era Modern.');
    }

    private function seedCovidYear(Era $era): void
    {
        $year = Year::where('era_id', $era->id)->where('year', 2020)->first();

        if (!$year) {
            $this->command?->warn('Year 2020 tidak ditemukan di era modern, lewati.');
            return;
        }

        $year->update([
            'summary' => 'Pandemi COVID-19 yang masuk ke Indonesia pada Maret 2020 mendorong transformasi besar dalam sistem kesehatan nasional, mulai dari penerapan protokol kesehatan masyarakat (masker, jaga jarak, cuci tangan) hingga percepatan pengembangan dan distribusi vaksin secara nasional.',
        ]);

        $gambarCovid1 = 'https://drive.google.com/file/d/16_dq-S932UpgYfiJhm9UJK1_So5pE7xX/view?usp=drive_link';
        $gambarCovid2 = 'https://drive.google.com/file/d/1rd1QhrnW7IpMRv8BK4xxIMud-jqp3h13/view?usp=drive_link';
        $pedomanCovid = 'https://drive.google.com/file/d/13eeGg5bt83x-e1yZW_C54Rg6h2fVgKqv/view?usp=drive_link';

        $sections = [
            [
                'title' => 'Pandemi COVID-19 di Indonesia',
                'blocks' => [
                    ['type' => 'text', 'content' => 'Kasus pertama COVID-19 di Indonesia diumumkan secara resmi oleh pemerintah pada awal Maret 2020. Sejak saat itu, penyebaran virus SARS-CoV-2 meluas dengan cepat ke berbagai provinsi, memaksa pemerintah menerapkan kebijakan pembatasan sosial berskala besar (PSBB) untuk menekan laju penularan.'],
                    ['type' => 'image', 'content' => $gambarCovid1],
                    ['type' => 'video', 'content' => 'https://www.youtube.com/watch?v=CONTOH_VIDEO_COVID'],
                ],
            ],
            [
                'title' => 'Dampak Sosial dan Ekonomi Pandemi',
                'blocks' => [
                    ['type' => 'text', 'content' => 'Pandemi COVID-19 tidak hanya berdampak pada sektor kesehatan, tetapi juga sosial dan ekonomi. Aktivitas belajar-mengajar, bekerja, dan beribadah beralih ke sistem daring, sementara banyak sektor usaha mengalami tekanan berat akibat pembatasan mobilitas masyarakat.'],
                    ['type' => 'image', 'content' => $gambarCovid2],
                    ['type' => 'pdf', 'content' => $pedomanCovid],
                ],
            ],
            [
                'title' => 'Protokol Kesehatan dan Vaksinasi',
                'blocks' => [
                    ['type' => 'text', 'content' => 'Pemerintah menggalakkan protokol kesehatan 5M (memakai masker, mencuci tangan, menjaga jarak, menjauhi kerumunan, mengurangi mobilitas) sembari mempercepat program vaksinasi nasional untuk membentuk kekebalan kelompok di masyarakat.'],
                    ['type' => 'pdf', 'content' => $pedomanCovid],
                    ['type' => 'text', 'content' => 'Program vaksinasi nasional COVID-19 di Indonesia resmi dimulai pada Januari 2021, diprioritaskan bagi tenaga kesehatan sebelum diperluas bertahap ke kelompok lanjut usia dan masyarakat umum.'],
                ],
            ],
        ];

        foreach ($sections as $index => $sectionData) {
            $section = Section::updateOrCreate(
                ['year_id' => $year->id, 'title' => $sectionData['title']],
                [
                    'order' => $index + 1,
                    'is_published' => true,
                ]
            );

            $section->contentBlocks()->delete();

            $blocksToCreate = [];
            foreach ($sectionData['blocks'] as $blockIndex => $block) {
                $blocksToCreate[] = [
                    'type' => $block['type'],
                    'content' => $block['content'],
                    'order' => $blockIndex + 1,
                ];
            }
            $section->contentBlocks()->createMany($blocksToCreate);
        }

        $vaccine = Vaccine::updateOrCreate(
            ['name' => 'Vaksin COVID-19 (Sinovac)'],
            [
                'photo' => 'https://drive.google.com/file/d/1zzTFN9HTX9GPs454AVIICRLV-08vkIj9/view?usp=drive_link',
                'photo_locked' => 'https://drive.google.com/file/d/1pAoTAqAyMc6JR4EJWplpuNPLwApfkJyT/view?usp=drive_link',
                'manufacturer' => 'Sinovac Biotech / Bio Farma',
                'disease_target' => 'COVID-19',
                'year_introduced' => 2020,
                'description' => 'Vaksin pertama yang digunakan dalam program vaksinasi nasional Indonesia untuk menanggulangi pandemi COVID-19, mulai didistribusikan secara bertahap sejak Januari 2021.',
            ]
        );

        $year->vaccines()->syncWithoutDetaching([$vaccine->id]);
    }

    private function seedDummyYears(Era $era): void
    {
        $dummySectionTitles = [
            'Latar Belakang Peristiwa',
            'Kebijakan dan Respons Pemerintah',
            'Dampak dan Pembelajaran',
        ];

        $blockPool = ['text', 'image', 'video', 'pdf'];

        for ($y = 2021; $y <= 2029; $y++) {
            $year = Year::where('era_id', $era->id)->where('year', $y)->first();

            if (!$year) {
                $this->command?->warn("Year {$y} tidak ditemukan di era modern, lewati.");
                continue;
            }

            foreach ($dummySectionTitles as $index => $title) {
                $section = Section::updateOrCreate(
                    ['year_id' => $year->id, 'title' => "{$title} ({$y})"],
                    [
                        'order' => $index + 1,
                        'is_published' => true,
                    ]
                );

                $section->contentBlocks()->delete();

                // 2-3 block per section, tipe diacak dari $blockPool
                $blockCount = random_int(2, 3);
                $blocksToCreate = [];
                for ($b = 1; $b <= $blockCount; $b++) {
                    $type = $blockPool[array_rand($blockPool)];
                    $blocksToCreate[] = [
                        'type' => $type,
                        'content' => $this->dummyContentFor($type, $y, $index + 1, $b),
                        'order' => $b,
                    ];
                }
                $section->contentBlocks()->createMany($blocksToCreate);
            }
        }
    }

    private function dummyContentFor(string $type, int $year, int $sectionOrder, int $blockOrder): string
    {
        return match ($type) {
            'text' => "Ini adalah teks dummy untuk section ke-{$sectionOrder} pada year dummy {$year}, dipakai untuk menguji tampilan & unlock, bukan konten historis nyata.",
            'image' => "https://drive.google.com/file/d/CONTOH_FILE_ID_DUMMY_{$year}_{$sectionOrder}_{$blockOrder}/view",
            'video' => 'https://www.youtube.com/watch?v=CONTOH_VIDEO_DUMMY',
            'pdf' => "https://drive.google.com/file/d/CONTOH_FILE_ID_PDF_DUMMY_{$year}_{$sectionOrder}/view",
            default => 'dummy',
        };
    }
}