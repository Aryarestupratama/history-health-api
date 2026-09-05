<?php

namespace Database\Seeders;

use App\Models\Era;
use App\Models\Section;
use App\Models\Vaccine;
use App\Models\Year;
use Illuminate\Database\Seeder;

/**
 * Seeder era Modern.
 *
 * Year #1 & #2 diisi data REAL sesuai dokumen "DATABASE_MODERN.docx":
 *   - Year 1974 : Eradikasi Cacar (Smallpox) — 1 vaksin.
 *   - Year 2020 : Pandemi COVID-19 — 4 vaksin (Sinovac, AstraZeneca,
 *                 Pfizer-BioNTech, Moderna) di-assign ke year yang sama.
 *
 * 6 year setelah COVID (2021-2026) sengaja DUMMY, tujuannya untuk menguji
 * roadmap & sequential unlock year di aplikasi (year berikutnya baru
 * terbuka setelah year sebelumnya diselesaikan).
 */
class ModernSeeder extends Seeder
{
    public function run(): void
    {
        $era = Era::where('slug', 'modern')->first();

        if (!$era) {
            $this->command?->warn('Era "modern" tidak ditemukan, jalankan EraSeeder dulu.');
            return;
        }

        $this->seedCacarYear($era);
        $this->seedCovidYear($era);
        $this->seedDummyYears($era);

        $this->command?->info('ModernSeeder selesai: year Cacar (1974) + year COVID-19 (2020) real, 6 year dummy (2021-2026).');
    }

    private function seedCacarYear(Era $era): void
    {
        $year = Year::updateOrCreate(
            ['era_id' => $era->id, 'year' => 1974],
            [
                'title' => 'Eradikasi Cacar di Indonesia',
                'summary' => 'Cacar (smallpox) masih muncul di Indonesia hingga awal 1970-an, sebelum akhirnya dinyatakan bebas cacar pada tahun 1974 melalui program eradikasi global yang digagas WHO, menjadi salah satu pencapaian kesehatan masyarakat terbesar di abad ke-20.',
            ]
        );

        $gambarCacar1 = 'https://drive.google.com/file/d/1aTaPkpeFkxifnIEJBMUTsLHh5n-RZLuI/view?usp=drive_link';
        $gambarCacar2 = 'https://drive.google.com/file/d/1SpHxOHhRFgN833jRuhysZfbyRlZ59qiF/view?usp=drive_link';
        $videoCacar = 'https://youtu.be/1qo_9a2jNvY?si=SuZO3ZHqVVytHYZ7';

        $sections = [
            [
                'title' => 'Wabah Cacar di Indonesia',
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'Cacar atau smallpox merupakan salah satu penyakit menular tertua yang menyerang manusia, dan di Indonesia penyakit ini terus muncul secara sporadis dari masa kolonial hingga awal tahun 1970-an. Berbeda dengan banyak penyakit menular lain yang sudah mulai bisa dikendalikan pasca kemerdekaan, cacar tetap menjadi ancaman serius karena penyebarannya yang cepat melalui kontak langsung maupun droplet udara, serta tingkat kematian yang tinggi terutama pada kelompok anak-anak dan penduduk dengan akses layanan kesehatan terbatas. Wabah-wabah lokal masih dilaporkan terjadi di berbagai daerah, memaksa pemerintah untuk terus menjalankan program vaksinasi cacar secara berkelanjutan sembari bekerja sama dengan organisasi kesehatan internasional.',
                        'order' => 1,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarCacar1,
                        'order' => 2,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarCacar2,
                        'order' => 3,
                    ],
                ],
            ],
            [
                'title' => 'Program Eradikasi Cacar Global',
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'Pada dekade 1960-an, World Health Organization (WHO) mencanangkan program eradikasi cacar secara global dengan strategi vaksinasi massal serta pengawasan kasus yang ketat (surveillance and containment). Indonesia turut serta dalam program ini dengan memperluas jangkauan vaksinasi cacar ke seluruh pelosok negeri, termasuk daerah-daerah terpencil yang sebelumnya sulit dijangkau layanan kesehatan. Upaya ini melibatkan tenaga kesehatan yang dikerahkan dari desa ke desa untuk memberikan vaksin sekaligus mendeteksi dini kasus baru. Berkat kerja keras tersebut, Indonesia akhirnya berhasil dinyatakan bebas dari penyakit cacar pada tahun 1974, mendahului deklarasi WHO tahun 1980 yang menyatakan cacar telah diberantas sepenuhnya dari muka bumi — pencapaian yang hingga kini masih dianggap sebagai salah satu keberhasilan terbesar kesehatan masyarakat modern.',
                        'order' => 1,
                    ],
                    [
                        'type' => 'video',
                        'content' => $videoCacar,
                        'order' => 2,
                    ],
                ],
            ],
        ];

        $this->createSections($year, $sections);

        $vaccine = Vaccine::updateOrCreate(
            ['name' => 'Vaksin Cacar (Smallpox Vaccine)'],
            [
                'photo' => 'https://drive.google.com/file/d/1USdZ3NXu07Q7LyQrAPZHoECxv8mN_txC/view?usp=drive_link',
                'photo_locked' => 'https://drive.google.com/file/d/1bRGZcR6_CtZ6MX2EguHlZPbaFYl45dgl/view?usp=sharing',
                'manufacturer' => 'Dinas Kesehatan / Program Eradikasi Cacar WHO',
                'disease_target' => 'Cacar (Smallpox)',
                'year_introduced' => 1974,
                'description' => 'Vaksin cacar digunakan secara masif dalam program eradikasi global yang digagas WHO. Program vaksinasi berskala nasional ini berhasil membebaskan Indonesia dari penyakit cacar pada tahun 1974, menjadikannya salah satu vaksin dengan dampak eradikasi penyakit paling signifikan dalam sejarah kesehatan dunia.',
            ]
        );

        $year->vaccines()->syncWithoutDetaching([$vaccine->id]);
    }

    private function seedCovidYear(Era $era): void
    {
        $year = Year::updateOrCreate(
            ['era_id' => $era->id, 'year' => 2020],
            [
                'title' => 'Pandemi COVID-19',
                'summary' => 'Pandemi COVID-19 yang berlangsung sejak 2020 hingga 2023 menjadi salah satu krisis kesehatan terbesar yang pernah dihadapi Indonesia sejak kemerdekaan, dengan dampak yang sangat luas terhadap sistem kesehatan, ekonomi, dan kehidupan sosial masyarakat, sekaligus mendorong percepatan program vaksinasi nasional dan transformasi layanan kesehatan digital.',
            ]
        );

        $gambarCovid1 = 'https://drive.google.com/file/d/16_dq-S932UpgYfiJhm9UJK1_So5pE7xX/view?usp=drive_link';
        $gambarCovid2 = 'https://drive.google.com/file/d/1rd1QhrnW7IpMRv8BK4xxIMud-jqp3h13/view?usp=drive_link';
        $videoCovid1 = 'https://youtu.be/kW8PqjgImlU?si=dOQZuIPB8Warl-Hf';
        $videoCovid2 = 'https://youtu.be/0dAoCfgAQw8?si=9WSrbFDX7aCApgJx';
        $pdfCovid1 = 'https://drive.google.com/file/d/13eeGg5bt83x-e1yZW_C54Rg6h2fVgKqv/view?usp=drive_link'; // Pedoman Pencegahan dan Pengendalian COVID-19

        $sections = [
            [
                'title' => 'Pandemi COVID-19 di Indonesia',
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'COVID-19 merupakan pandemi besar yang berlangsung dari tahun 2020 hingga 2023 dan tercatat sebagai salah satu krisis kesehatan terbesar yang pernah dialami Indonesia sejak masa kemerdekaan. Kasus pertama diumumkan secara resmi oleh pemerintah pada awal Maret 2020, dan sejak saat itu penyebaran virus SARS-CoV-2 meluas dengan sangat cepat ke hampir seluruh provinsi di Indonesia. Pemerintah kemudian menerapkan berbagai kebijakan pembatasan sosial berskala besar (PSBB) dan pemberlakuan pembatasan kegiatan masyarakat (PPKM) untuk menekan laju penularan, yang berdampak signifikan terhadap mobilitas dan aktivitas sehari-hari masyarakat di berbagai daerah.',
                        'order' => 1,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarCovid1,
                        'order' => 2,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarCovid2,
                        'order' => 3,
                    ],
                ],
            ],
            [
                'title' => 'Liputan dan Edukasi COVID-19',
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'Selama pandemi berlangsung, berbagai kanal media turut berperan menyebarkan informasi dan edukasi kepada masyarakat mengenai bahaya COVID-19, cara penularannya, serta pentingnya penerapan protokol kesehatan. Liputan-liputan ini membantu masyarakat memahami perkembangan situasi pandemi dari waktu ke waktu, mulai dari lonjakan kasus di berbagai gelombang, respons pemerintah, hingga upaya-upaya tenaga kesehatan yang berjuang di garis depan menangani pasien COVID-19 di tengah keterbatasan sumber daya.',
                        'order' => 1,
                    ],
                    [
                        'type' => 'video',
                        'content' => $videoCovid1,
                        'order' => 2,
                    ],
                    [
                        'type' => 'video',
                        'content' => $videoCovid2,
                        'order' => 3,
                    ],
                ],
            ],
            [
                'title' => 'Vaksinasi COVID-19 di Indonesia',
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'Untuk menekan penyebaran COVID-19 dan membentuk kekebalan kelompok (herd immunity), pemerintah Indonesia menjalankan program vaksinasi nasional secara bertahap mulai Januari 2021. Program ini diprioritaskan bagi tenaga kesehatan yang berada di garis depan penanganan pandemi, sebelum kemudian diperluas ke kelompok lanjut usia, pekerja publik, dan akhirnya masyarakat umum. Beberapa jenis vaksin digunakan dalam program ini, di antaranya Sinovac, AstraZeneca, Pfizer-BioNTech, dan Moderna, masing-masing dengan karakteristik teknologi dan jadwal pemberian dosis yang berbeda-beda namun sama-sama bertujuan melindungi masyarakat dari risiko keparahan akibat infeksi COVID-19.',
                        'order' => 1,
                    ],
                    [
                        'type' => 'text',
                        'content' => 'Distribusi vaksin dilakukan secara bertahap ke seluruh provinsi dengan melibatkan puskesmas, rumah sakit, hingga sentra-sentra vaksinasi massal di berbagai daerah. Program vaksinasi ini menjadi salah satu program imunisasi nasional dengan skala dan kecepatan pelaksanaan terbesar dalam sejarah kesehatan Indonesia, dan menjadi kunci penting dalam transisi dari status pandemi menuju endemi pada tahun-tahun berikutnya.',
                        'order' => 2,
                    ],
                    [
                        'type' => 'pdf',
                        'content' => $pdfCovid1,
                        'order' => 3,
                    ],
                ],
            ],
        ];

        $this->createSections($year, $sections);

        $vaccines = [
            [
                'name' => 'Vaksin COVID-19 (Sinovac)',
                'photo' => 'https://drive.google.com/file/d/15VADVY9JWgt0FEs0_hrY1CmFVay1jbYr/view?usp=drive_link',
                'photo_locked' => 'https://drive.google.com/file/d/1Dor-236We0wzx_DkYjKItoc6cA6D7do5/view?usp=drive_link',
                'manufacturer' => 'Sinovac Biotech / Bio Farma',
                'description' => 'Vaksin inactivated-virus yang menjadi vaksin pertama digunakan dalam program vaksinasi nasional COVID-19 di Indonesia, mulai didistribusikan secara bertahap sejak Januari 2021, diprioritaskan bagi tenaga kesehatan.',
            ],
            [
                'name' => 'Vaksin COVID-19 (AstraZeneca)',
                'photo' => 'https://drive.google.com/file/d/1WS8O36W8ffbdzkma_l-hNFoQnMu2XPog/view?usp=drive_link',
                'photo_locked' => 'https://drive.google.com/file/d/10pNvROTHDm81raru_gscnDYI15MJxzTh/view?usp=drive_link',
                'manufacturer' => 'AstraZeneca / Universitas Oxford',
                'description' => 'Vaksin berbasis vektor adenovirus yang turut digunakan dalam program vaksinasi nasional, menjadi salah satu opsi vaksin yang didistribusikan lewat mekanisme kerja sama multilateral maupun jalur donasi ke Indonesia.',
            ],
            [
                'name' => 'Vaksin COVID-19 (Pfizer-BioNTech)',
                'photo' => 'https://drive.google.com/file/d/1h987uhyDNYkrFzRvcTu2F19MZEwIlzat/view?usp=drive_link',
                'photo_locked' => 'https://drive.google.com/file/d/1HpjlQZkQ1yxCjvrChVawjAHf2gIR-Z2L/view?usp=drive_link',
                'manufacturer' => 'Pfizer / BioNTech',
                'description' => 'Vaksin berbasis teknologi mRNA yang digunakan sebagai salah satu pilihan vaksin dalam program vaksinasi COVID-19 nasional maupun booster, dikenal dengan tingkat efikasi yang tinggi terhadap gejala berat.',
            ],
            [
                'name' => 'Vaksin COVID-19 (Moderna)',
                'photo' => 'https://drive.google.com/file/d/1F1fwkBUTao9UnC1T7xtr-TmDCdN0e7R6/view?usp=drive_link',
                'photo_locked' => 'https://drive.google.com/file/d/1lqLcotBvZa69Zn7RximLADYj7rv6idTO/view?usp=drive_link',
                'manufacturer' => 'Moderna',
                'description' => 'Vaksin berbasis teknologi mRNA yang turut digunakan dalam program vaksinasi dan booster COVID-19 di Indonesia, menjadi salah satu dari beberapa jenis vaksin yang tersedia bagi masyarakat umum.',
            ],
        ];

        $vaccineIds = [];
        foreach ($vaccines as $v) {
            $vaccine = Vaccine::updateOrCreate(
                ['name' => $v['name']],
                [
                    'photo' => $v['photo'],
                    'photo_locked' => $v['photo_locked'],
                    'manufacturer' => $v['manufacturer'],
                    'disease_target' => 'COVID-19',
                    'year_introduced' => 2020,
                    'description' => $v['description'],
                ]
            );
            $vaccineIds[] = $vaccine->id;
        }

        // Semua 4 vaksin COVID-19 di-assign ke year yang sama (2020).
        $year->vaccines()->syncWithoutDetaching($vaccineIds);
    }

    private function seedDummyYears(Era $era): void
    {
        $dummySectionTitles = [
            'Latar Belakang Peristiwa',
            'Kebijakan dan Respons Pemerintah',
            'Dampak dan Pembelajaran',
        ];

        $blockPool = ['text', 'image', 'video', 'pdf'];

        for ($y = 2021; $y <= 2026; $y++) {
            $year = Year::updateOrCreate(
                ['era_id' => $era->id, 'year' => $y],
                [
                    'title' => "[Dummy] Tahun Modern {$y}",
                    'summary' => 'Konten dummy untuk menguji roadmap & sequential unlock year era Modern setelah year COVID-19 (2020) diselesaikan.',
                ]
            );

            foreach ($dummySectionTitles as $index => $title) {
                $section = Section::updateOrCreate(
                    ['year_id' => $year->id, 'title' => "{$title} ({$y})"],
                    [
                        'order' => $index + 1,
                        'is_published' => true,
                    ]
                );

                $section->contentBlocks()->delete();

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

    /**
     * @param array<int, array{title: string, blocks: array<int, array{type: string, content: string, order: int}>}> $sections
     */
    private function createSections(Year $year, array $sections): void
    {
        foreach ($sections as $index => $sectionData) {
            $section = Section::updateOrCreate(
                ['year_id' => $year->id, 'title' => $sectionData['title']],
                [
                    'order' => $index + 1,
                    'is_published' => true,
                ]
            );

            $section->contentBlocks()->delete();
            $section->contentBlocks()->createMany($sectionData['blocks']);
        }
    }

    private function dummyContentFor(string $type, int $year, int $sectionOrder, int $blockOrder): string
    {
        return match ($type) {
            'text' => "Ini adalah teks dummy untuk section ke-{$sectionOrder} pada year dummy {$year}, dipakai untuk menguji tampilan roadmap & sequential unlock, bukan konten historis nyata.",
            'image' => "https://drive.google.com/file/d/CONTOH_FILE_ID_DUMMY_{$year}_{$sectionOrder}_{$blockOrder}/view",
            'video' => 'https://www.youtube.com/watch?v=CONTOH_VIDEO_DUMMY',
            'pdf' => "https://drive.google.com/file/d/CONTOH_FILE_ID_PDF_DUMMY_{$year}_{$sectionOrder}/view",
            default => 'dummy',
        };
    }
}