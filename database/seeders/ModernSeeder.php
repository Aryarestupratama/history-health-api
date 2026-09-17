<?php

namespace Database\Seeders;

use App\Models\Era;
use App\Models\EraQuiz;
use App\Models\Section;
use App\Models\Vaccine;
use App\Models\Year;
use App\Models\YearSummary;
use App\Models\YearSummaryPoint;
use App\Models\YearSummaryPointOption;
use Illuminate\Database\Seeder;

/**
 * Seeder era Modern.
 *
 * Year #1 & #2 diisi data REAL sesuai dokumen "DATABASE_MODERN.docx":
 *   - Year 1974 : Eradikasi Cacar (Smallpox) — 1 vaksin.
 *   - Year 2020 : Pandemi COVID-19 — 4 vaksin (Sinovac, AstraZeneca,
 *                 Pfizer-BioNTech, Moderna) di-assign ke year yang sama.
 *
 * (Revisi — Kuis Sumatif Era / "final boss") 6 year dummy (2021-2026) yang
 * dulu dipakai untuk menguji sequential unlock lintas tahun DIHAPUS TOTAL.
 * Era Modern sekarang cuma 2 year (Cacar 1974, COVID 2020) — begitu
 * keduanya "completed" oleh user, roadmap langsung menampilkan kuis
 * sumatif era ("final boss") sebagai node terakhir, TANPA year tambahan
 * apa pun di antaranya (Rules.md R-ERAQUIZ, Schema.md era_quizzes dkk).
 * Method seedDummyYears()/dummyContentFor() yang lama sudah tidak dipanggil
 * lagi — dihapus dari file ini (bukan cuma di-nonaktifkan) supaya tidak
 * membingungkan admin yang baca seeder ini di kemudian hari.
 *
 * (Revisi skema — Header/Rangkuman/Quote/Referensi/Caption)
 * - `summary` (teks) sudah tidak ada, diganti `summary_image` (link gdrive
 *   infografis). Teks rangkuman lama DIPINDAH jadi komentar di tiap method
 *   supaya tidak hilang — dipakai sebagai BRIEF untuk admin bikin infografis
 *   asli nanti, BUKAN dipakai langsung sebagai isi field.
 * - `summary_image` di seeder ini masih PLACEHOLDER (file ID dummy) karena
 *   aset infografis asli belum ada — wajib diganti sebelum quiz year tsb
 *   bisa di-publish (R-QUIZ-05 tetap berlaku ke kolom ini).
 * - `quote_text` & `references` juga masih PLACEHOLDER — tandanya eksplisit
 *   di teks ("[Placeholder]") supaya tidak tertukar dengan data historis
 *   yang sudah diverifikasi (beda dari teks section yang memang sudah real).
 * - `header_image` per section OPSIONAL — sengaja dibiarkan kosong (null) di
 *   seeder ini karena belum ada aset gambar header, bukan berarti wajib diisi.
 * - `caption` ditambahkan untuk block image/video yang datanya sudah real
 *   (Cacar & COVID), disusun dari konteks paragraf section yang sama —
 *   tetap perlu diverifikasi ulang oleh admin/tim konten, bukan sumber pasti.
 * (Revisi lanjutan — Cacar) Header per section, video Program Eradikasi
 * Cacar Global, dan 2 section baru ("Pendahuluan"/"Sub Materi") sudah
 * diisi link Google Drive asli untuk year 1974. `summary_image` year
 * 1974 juga sudah diganti dari placeholder ke link infografis asli.
 * `quote_text`/`references` year 1974 ditulis lebih "jadi" (bukan lagi
 * `[Placeholder]` polos) supaya kelihatan bentuk akhirnya di preview,
 * tapi tetap ditandai perlu verifikasi sumber sebelum dianggap final.
 * Teks isi 2 section baru ("Pendahuluan"/"Sub Materi") MASIH placeholder
 * (belum ada draft dari tim konten) — cuma header & gambarnya yang asli.
 *
 * (Revisi terbaru — Rangkuman Interaktif) `summary_image` (infografis
 * statis) DIHAPUS TOTAL dari `years`, digantikan tabel terpisah
 * `year_summaries` → `year_summary_points` (tepat 7 poin) →
 * `year_summary_point_options` (tepat 3 opsi/poin, 1 benar + 2 pengecoh)
 * — pola "correct statement", lihat Schema.md §2.19–2.22, Rules.md Bab 11.
 * `quote_text`/`references` TIDAK terpengaruh, tetap di kolom `years` yang
 * sama seperti sebelumnya. Method baru `createYearSummary()` menggantikan
 * penulisan langsung `summary_image` di `Year::updateOrCreate()`.
 * 7 poin Cacar (1974) disusun dari brief/isi section yang sudah real di
 * bawah — cukup representatif, tapi tetap disarankan direview tim konten.
 * 7 poin COVID (2020) masih ditandai "[Placeholder]" karena datanya sendiri
 * (quote/referensi) juga masih placeholder — pola penandaan sama.
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

        $yearCacar = Year::where('era_id', $era->id)->where('year', 1974)->first();
        $yearCovid = Year::where('era_id', $era->id)->where('year', 2020)->first();

        if ($yearCacar && $yearCovid) {
            $this->seedEraQuiz($era);
        } else {
            $this->command?->warn('Year Cacar (1974) atau COVID (2020) tidak ditemukan, seedEraQuiz dilewati.');
        }

        $this->command?->info('ModernSeeder selesai: year Cacar (1974) + year COVID-19 (2020) real, Rangkuman Interaktif (7 poin) ter-publish untuk keduanya, kuis sumatif era ter-publish (soal ditarik otomatis dari kuis formatif tiap year: 10 Cacar + 10 COVID, 20 total per attempt).');
    }

    private function seedCacarYear(Era $era): void
    {
        // Brief lama utk infografis (dulu teks `summary`, dipindah ke komentar):
        // "Cacar (smallpox) masih muncul di Indonesia hingga awal 1970-an,
        // sebelum akhirnya dinyatakan bebas cacar pada tahun 1974 melalui
        // program eradikasi global yang digagas WHO, menjadi salah satu
        // pencapaian kesehatan masyarakat terbesar di abad ke-20."
        $year = Year::updateOrCreate(
            ['era_id' => $era->id, 'year' => 1974],
            [
                'title' => 'Eradikasi Cacar di Indonesia',
                'quote_text' => '"Eradikasi cacar adalah bukti bahwa kerja sama global dan kemauan politik bisa mengalahkan penyakit yang pernah membunuh jutaan orang." — [Perlu verifikasi: cek ulang sumber/atribusi kutipan asli sebelum publish, mis. dari WHO atau tokoh kesehatan terkait program eradikasi cacar.]',
                'references' => [
                    'World Health Organization, "Smallpox Eradication Programme" — [Perlu verifikasi: lengkapi tahun terbit & tautan resmi.]',
                    'Kementerian Kesehatan RI, dokumentasi program eradikasi cacar 1974 — [Perlu verifikasi: cari dokumen/arsip resmi yang bisa dirujuk.]',
                ],
            ]
        );

        // Rangkuman Interaktif (7 poin correct-statement) — disusun dari
        // brief/isi section real di bawah, cukup representatif tapi tetap
        // disarankan direview tim konten sebelum dianggap final.
        $this->createYearSummary($year, [
            [
                'options' => [
                    'Cacar sudah muncul di Indonesia secara sporadis sejak masa kolonial hingga awal tahun 1970-an.',
                    'Cacar baru pertama kali muncul di Indonesia pada awal tahun 1970-an, tanpa riwayat sebelumnya.',
                    'Cacar hanya pernah muncul di Indonesia pada masa penjajahan Belanda, sebelum abad ke-20.',
                ],
                'correct' => 0,
            ],
            [
                'options' => [
                    'Cacar hanya menyebar lewat gigitan nyamuk dan jarang menimbulkan kematian.',
                    'Cacar menyebar lewat kontak langsung maupun droplet udara, dengan tingkat kematian tinggi terutama pada anak-anak.',
                    'Cacar menyebar lewat air minum yang terkontaminasi, dengan tingkat kematian rendah di segala usia.',
                ],
                'correct' => 1,
            ],
            [
                'options' => [
                    'PBB mencanangkan program eradikasi cacar secara global pada dekade 1950-an.',
                    'UNICEF mencanangkan program eradikasi cacar secara global pada dekade 1970-an.',
                    'World Health Organization (WHO) mencanangkan program eradikasi cacar secara global pada dekade 1960-an.',
                ],
                'correct' => 2,
            ],
            [
                'options' => [
                    'Strategi utama program ini adalah vaksinasi massal dan pengawasan kasus ketat (surveillance and containment).',
                    'Strategi utama program ini adalah karantina wilayah total tanpa vaksinasi sama sekali.',
                    'Strategi utama program ini adalah penutupan seluruh fasilitas kesehatan untuk sementara waktu.',
                ],
                'correct' => 0,
            ],
            [
                'options' => [
                    'Vaksinasi cacar hanya dilakukan di kota-kota besar karena keterbatasan tenaga kesehatan.',
                    'Tenaga kesehatan dikerahkan hingga ke pelosok desa untuk memberi vaksin sekaligus mendeteksi dini kasus baru.',
                    'Deteksi kasus cacar dilakukan lewat sensus penduduk tahunan, tanpa disertai vaksinasi langsung.',
                ],
                'correct' => 1,
            ],
            [
                'options' => [
                    'Indonesia dinyatakan bebas dari penyakit cacar pada tahun 1980.',
                    'Indonesia dinyatakan bebas dari penyakit cacar pada tahun 1969.',
                    'Indonesia dinyatakan bebas dari penyakit cacar pada tahun 1974.',
                ],
                'correct' => 2,
            ],
            [
                'options' => [
                    'Pencapaian bebas cacar Indonesia mendahului deklarasi WHO tahun 1980 yang menyatakan cacar sudah diberantas sepenuhnya dari dunia.',
                    'Pencapaian bebas cacar Indonesia terjadi setelah deklarasi WHO tahun 1980 tentang eradikasi cacar global.',
                    'Deklarasi WHO tentang eradikasi cacar global baru terjadi pada tahun 1990, jauh setelah Indonesia bebas cacar.',
                ],
                'correct' => 0,
            ],
        ]);

        $gambarCacar1 = 'https://drive.google.com/file/d/1aTaPkpeFkxifnIEJBMUTsLHh5n-RZLuI/view?usp=drive_link';
        $gambarCacar2 = 'https://drive.google.com/file/d/1SpHxOHhRFgN833jRuhysZfbyRlZ59qiF/view?usp=drive_link';

        // Header per section (baru).
        $headerWabah = 'https://drive.google.com/file/d/1DJzaRUkDIsRoqKswXqeucngFswINO26R/view?usp=drive_link';
        $headerPendahuluan = 'https://drive.google.com/file/d/1IPxi5lFe_RhtU3UXMk3ePfLncvnXCmCK/view?usp=drive_link';
        $headerSubMateri = 'https://drive.google.com/file/d/1JokBhTeSvz2E3hKDVQcLPeM33-ewTL2x/view?usp=drive_link';

        // Gambar konten section "Pendahuluan" (baru) — masing-masing diikuti
        // block teks placeholder setelahnya, TODO: isi teks aslinya oleh
        // tim konten (lihat catatan di bawah tiap block).
        $gambarPemantik = 'https://drive.google.com/file/d/1XTDBD_z1O7GKpseis0L190EQmnz7j7ze/view?usp=drive_link';
        $gambarSudahSiap = 'https://drive.google.com/file/d/1gBuBMBSbVJnkho0Hi4tpK2WnwjAb7MpL/view?usp=drive_link';

        // Video Cacar — sebelumnya link YouTube (dihapus, lihat catatan
        // lama), sekarang diisi link Google Drive pengganti (Rules.md
        // R-CMS-06 revisi). Ditempatkan di section "Program Eradikasi
        // Cacar Global" (dulu kosong menunggu link ini).
        $videoCacar = 'https://drive.google.com/file/d/1-H7MCo40mP7w2ha4uPt3T0FiPS4-CdmO/view?usp=drive_link';

        $sections = [
            [
                'title' => 'Wabah Cacar di Indonesia',
                'header_image' => $headerWabah,
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'Cacar atau smallpox merupakan salah satu penyakit menular tertua yang menyerang manusia, dan di Indonesia penyakit ini terus muncul secara sporadis dari masa kolonial hingga awal tahun 1970-an. Berbeda dengan banyak penyakit menular lain yang sudah mulai bisa dikendalikan pasca kemerdekaan, cacar tetap menjadi ancaman serius karena penyebarannya yang cepat melalui kontak langsung maupun droplet udara, serta tingkat kematian yang tinggi terutama pada kelompok anak-anak dan penduduk dengan akses layanan kesehatan terbatas. Wabah-wabah lokal masih dilaporkan terjadi di berbagai daerah, memaksa pemerintah untuk terus menjalankan program vaksinasi cacar secara berkelanjutan sembari bekerja sama dengan organisasi kesehatan internasional.',
                        'caption' => null,
                        'order' => 1,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarCacar1,
                        'caption' => 'Dokumentasi kasus/penanganan cacar di Indonesia sebelum eradikasi (perlu verifikasi sumber asli oleh admin).',
                        'order' => 2,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarCacar2,
                        'caption' => 'Dokumentasi terkait wabah cacar di Indonesia (perlu verifikasi sumber asli oleh admin).',
                        'order' => 3,
                    ],
                ],
            ],
            [
                // (Baru) Section "Pendahuluan" — pola tiap gambar diikuti
                // block teks setelahnya. Teks masih PLACEHOLDER karena
                // belum ada draft aslinya dari tim konten, wajib diganti
                // sebelum section ini di-publish beneran (is_published
                // tetap true di seeder supaya kelihatan di preview, tapi
                // TODO teksnya jangan lolos ke produksi apa adanya).
                'title' => 'Pendahuluan Program Eradikasi Cacar',
                'header_image' => $headerPendahuluan,
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => '[Placeholder] Teks pembuka pendahuluan program eradikasi cacar — jelaskan konteks awal sebelum masuk ke gambar pemantik di bawah. Ganti dengan teks asli dari tim konten.',
                        'caption' => null,
                        'order' => 1,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarPemantik,
                        'caption' => 'Gambar pemantik (perlu verifikasi konteks & sumber oleh admin).',
                        'order' => 2,
                    ],
                    [
                        'type' => 'text',
                        'content' => '[Placeholder] Teks penjelasan setelah gambar pemantik — uraikan apa yang ingin dipancing/dipertanyakan dari gambar tsb ke pembaca. Ganti dengan teks asli dari tim konten.',
                        'caption' => null,
                        'order' => 3,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarSudahSiap,
                        'caption' => 'Gambar "sudah siap" (perlu verifikasi konteks & sumber oleh admin).',
                        'order' => 4,
                    ],
                    [
                        'type' => 'text',
                        'content' => '[Placeholder] Teks penjelasan setelah gambar "sudah siap" — lanjutkan narasi menuju materi Program Eradikasi Cacar Global. Ganti dengan teks asli dari tim konten.',
                        'caption' => null,
                        'order' => 5,
                    ],
                ],
            ],
            [
                'title' => 'Program Eradikasi Cacar Global',
                'header_image' => null,
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'Pada dekade 1960-an, World Health Organization (WHO) mencanangkan program eradikasi cacar secara global dengan strategi vaksinasi massal serta pengawasan kasus yang ketat (surveillance and containment). Indonesia turut serta dalam program ini dengan memperluas jangkauan vaksinasi cacar ke seluruh pelosok negeri, termasuk daerah-daerah terpencil yang sebelumnya sulit dijangkau layanan kesehatan. Upaya ini melibatkan tenaga kesehatan yang dikerahkan dari desa ke desa untuk memberikan vaksin sekaligus mendeteksi dini kasus baru. Berkat kerja keras tersebut, Indonesia akhirnya berhasil dinyatakan bebas dari penyakit cacar pada tahun 1974, mendahului deklarasi WHO tahun 1980 yang menyatakan cacar telah diberantas sepenuhnya dari muka bumi — pencapaian yang hingga kini masih dianggap sebagai salah satu keberhasilan terbesar kesehatan masyarakat modern.',
                        'caption' => null,
                        'order' => 1,
                    ],
                    [
                        'type' => 'video',
                        'content' => $videoCacar,
                        'caption' => 'Dokumentasi/edukasi program eradikasi cacar (perlu verifikasi isi & sumber oleh admin).',
                        'order' => 2,
                    ],
                ],
            ],
            [
                // (Baru) Section "Sub Materi" — belum ada teks/gambar isi
                // dari tim konten selain header-nya, jadi sementara diisi
                // 1 block teks placeholder supaya section tidak kosong
                // total (section tanpa block bisa aneh dirender Flutter).
                'title' => 'Sub Materi Program Eradikasi Cacar',
                'header_image' => $headerSubMateri,
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => '[Placeholder] Isi sub materi belum tersedia — lengkapi dengan konten tambahan terkait program eradikasi cacar (mis. detail teknis vaksinasi, tokoh terkait, atau data statistik) dari tim konten.',
                        'caption' => null,
                        'order' => 1,
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
        // Brief lama utk infografis (dulu teks `summary`, dipindah ke komentar):
        // "Pandemi COVID-19 yang berlangsung sejak 2020 hingga 2023 menjadi
        // salah satu krisis kesehatan terbesar yang pernah dihadapi Indonesia
        // sejak kemerdekaan, dengan dampak yang sangat luas terhadap sistem
        // kesehatan, ekonomi, dan kehidupan sosial masyarakat, sekaligus
        // mendorong percepatan program vaksinasi nasional dan transformasi
        // layanan kesehatan digital."
        $year = Year::updateOrCreate(
            ['era_id' => $era->id, 'year' => 2020],
            [
                'title' => 'Pandemi COVID-19',
                'quote_text' => '[Placeholder] "Pandemi mengajarkan kita bahwa kesehatan satu orang adalah urusan bersama." — ganti dengan kutipan asli (mis. dari pejabat kesehatan/tokoh terkait penanganan COVID-19).',
                'references' => [
                    '[Placeholder] Kementerian Kesehatan RI, Pedoman Pencegahan dan Pengendalian COVID-19.',
                    '[Placeholder] Satuan Tugas Penanganan COVID-19, laporan perkembangan kasus nasional.',
                    '[Placeholder] WHO Indonesia, situation report COVID-19.',
                ],
            ]
        );

        // Rangkuman Interaktif (7 poin) — masih PLACEHOLDER seperti quote/
        // referensi di atas, wajib diverifikasi/diganti tim konten sebelum
        // year ini dianggap final.
        $this->createYearSummary($year, [
            [
                'options' => [
                    '[Placeholder] Pandemi COVID-19 berlangsung di Indonesia sejak tahun 2020 hingga 2023.',
                    '[Placeholder] Pandemi COVID-19 berlangsung di Indonesia sejak tahun 2019 hingga 2021.',
                    '[Placeholder] Pandemi COVID-19 berlangsung di Indonesia sejak tahun 2021 hingga 2024.',
                ],
                'correct' => 0,
            ],
            [
                'options' => [
                    '[Placeholder] Kasus pertama COVID-19 diumumkan resmi pemerintah pada akhir Januari 2020.',
                    '[Placeholder] Kasus pertama COVID-19 diumumkan resmi pemerintah pada awal Maret 2020.',
                    '[Placeholder] Kasus pertama COVID-19 diumumkan resmi pemerintah pada pertengahan Desember 2019.',
                ],
                'correct' => 1,
            ],
            [
                'options' => [
                    '[Placeholder] Pemerintah menerapkan lockdown militer penuh sejak awal pandemi.',
                    '[Placeholder] Pemerintah hanya mengandalkan imbauan tanpa kebijakan pembatasan resmi.',
                    '[Placeholder] Pemerintah menerapkan PSBB, kemudian dilanjutkan PPKM, untuk menekan laju penularan.',
                ],
                'correct' => 2,
            ],
            [
                'options' => [
                    '[Placeholder] Program vaksinasi nasional COVID-19 mulai dijalankan bertahap sejak Januari 2021.',
                    '[Placeholder] Program vaksinasi nasional COVID-19 mulai dijalankan bertahap sejak Maret 2020.',
                    '[Placeholder] Program vaksinasi nasional COVID-19 mulai dijalankan bertahap sejak Desember 2021.',
                ],
                'correct' => 0,
            ],
            [
                'options' => [
                    '[Placeholder] Lansia menjadi kelompok prioritas pertama penerima vaksin COVID-19.',
                    '[Placeholder] Tenaga kesehatan menjadi kelompok prioritas pertama penerima vaksin COVID-19.',
                    '[Placeholder] Pelajar menjadi kelompok prioritas pertama penerima vaksin COVID-19.',
                ],
                'correct' => 1,
            ],
            [
                'options' => [
                    '[Placeholder] AstraZeneca menjadi vaksin pertama yang digunakan dalam program vaksinasi nasional Indonesia.',
                    '[Placeholder] Pfizer-BioNTech menjadi vaksin pertama yang digunakan dalam program vaksinasi nasional Indonesia.',
                    '[Placeholder] Sinovac menjadi vaksin pertama yang digunakan dalam program vaksinasi nasional Indonesia.',
                ],
                'correct' => 2,
            ],
            [
                'options' => [
                    '[Placeholder] Empat jenis vaksin digunakan dalam program vaksinasi nasional: Sinovac, AstraZeneca, Pfizer-BioNTech, dan Moderna.',
                    '[Placeholder] Hanya dua jenis vaksin yang digunakan dalam program vaksinasi nasional: Sinovac dan AstraZeneca.',
                    '[Placeholder] Lima jenis vaksin digunakan dalam program vaksinasi nasional, termasuk Johnson & Johnson.',
                ],
                'correct' => 0,
            ],
        ]);

        $gambarCovid1 = 'https://drive.google.com/file/d/16_dq-S932UpgYfiJhm9UJK1_So5pE7xX/view?usp=drive_link';
        $gambarCovid2 = 'https://drive.google.com/file/d/1rd1QhrnW7IpMRv8BK4xxIMud-jqp3h13/view?usp=drive_link';
        // TODO: 2 video COVID dulu link YouTube ($videoCovid1/$videoCovid2),
        // dihapus sementara karena video kini wajib via Google Drive
        // (Rules.md R-CMS-06 revisi). Kedua block video di section "Liputan
        // dan Edukasi COVID-19" di bawah ikut dihapus sampai ada link Drive
        // pengganti (ingat batas maks 2 video/section & 50MB/file kalau nanti diisi lagi).
        $pdfCovid1 = 'https://drive.google.com/file/d/13eeGg5bt83x-e1yZW_C54Rg6h2fVgKqv/view?usp=drive_link'; // Pedoman Pencegahan dan Pengendalian COVID-19

        $sections = [
            [
                'title' => 'Pandemi COVID-19 di Indonesia',
                'header_image' => null,
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'COVID-19 merupakan pandemi besar yang berlangsung dari tahun 2020 hingga 2023 dan tercatat sebagai salah satu krisis kesehatan terbesar yang pernah dialami Indonesia sejak masa kemerdekaan. Kasus pertama diumumkan secara resmi oleh pemerintah pada awal Maret 2020, dan sejak saat itu penyebaran virus SARS-CoV-2 meluas dengan sangat cepat ke hampir seluruh provinsi di Indonesia. Pemerintah kemudian menerapkan berbagai kebijakan pembatasan sosial berskala besar (PSBB) dan pemberlakuan pembatasan kegiatan masyarakat (PPKM) untuk menekan laju penularan, yang berdampak signifikan terhadap mobilitas dan aktivitas sehari-hari masyarakat di berbagai daerah.',
                        'caption' => null,
                        'order' => 1,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarCovid1,
                        'caption' => 'Dokumentasi suasana penanganan COVID-19 di Indonesia (perlu verifikasi sumber asli oleh admin).',
                        'order' => 2,
                    ],
                    [
                        'type' => 'image',
                        'content' => $gambarCovid2,
                        'caption' => 'Dokumentasi terkait kebijakan pembatasan sosial masa pandemi (perlu verifikasi sumber asli oleh admin).',
                        'order' => 3,
                    ],
                ],
            ],
            [
                'title' => 'Liputan dan Edukasi COVID-19',
                'header_image' => null,
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'Selama pandemi berlangsung, berbagai kanal media turut berperan menyebarkan informasi dan edukasi kepada masyarakat mengenai bahaya COVID-19, cara penularannya, serta pentingnya penerapan protokol kesehatan. Liputan-liputan ini membantu masyarakat memahami perkembangan situasi pandemi dari waktu ke waktu, mulai dari lonjakan kasus di berbagai gelombang, respons pemerintah, hingga upaya-upaya tenaga kesehatan yang berjuang di garis depan menangani pasien COVID-19 di tengah keterbatasan sumber daya.',
                        'caption' => null,
                        'order' => 1,
                    ],
                    // TODO: dulu ada 2 block 'video' di sini (link YouTube,
                    // dihapus). Tambahkan lagi setelah ada link Google Drive
                    // pengganti untuk liputan/edukasi COVID-19 (maks 2 video
                    // per section jika keduanya diisi lagi, R-CMS-06 revisi).
                ],
            ],
            [
                'title' => 'Vaksinasi COVID-19 di Indonesia',
                'header_image' => null,
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => 'Untuk menekan penyebaran COVID-19 dan membentuk kekebalan kelompok (herd immunity), pemerintah Indonesia menjalankan program vaksinasi nasional secara bertahap mulai Januari 2021. Program ini diprioritaskan bagi tenaga kesehatan yang berada di garis depan penanganan pandemi, sebelum kemudian diperluas ke kelompok lanjut usia, pekerja publik, dan akhirnya masyarakat umum. Beberapa jenis vaksin digunakan dalam program ini, di antaranya Sinovac, AstraZeneca, Pfizer-BioNTech, dan Moderna, masing-masing dengan karakteristik teknologi dan jadwal pemberian dosis yang berbeda-beda namun sama-sama bertujuan melindungi masyarakat dari risiko keparahan akibat infeksi COVID-19.',
                        'caption' => null,
                        'order' => 1,
                    ],
                    [
                        'type' => 'text',
                        'content' => 'Distribusi vaksin dilakukan secara bertahap ke seluruh provinsi dengan melibatkan puskesmas, rumah sakit, hingga sentra-sentra vaksinasi massal di berbagai daerah. Program vaksinasi ini menjadi salah satu program imunisasi nasional dengan skala dan kecepatan pelaksanaan terbesar dalam sejarah kesehatan Indonesia, dan menjadi kunci penting dalam transisi dari status pandemi menuju endemi pada tahun-tahun berikutnya.',
                        'caption' => null,
                        'order' => 2,
                    ],
                    [
                        'type' => 'pdf',
                        'content' => $pdfCovid1,
                        'caption' => 'Pedoman Pencegahan dan Pengendalian COVID-19, Kementerian Kesehatan RI (perlu verifikasi versi/edisi dokumen oleh admin).',
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

    /**
     * Kuis Sumatif Era ("final boss") — muncul setelah SELURUH year era
     * Modern (Cacar 1974 + COVID 2020) completed oleh user (R-ERAQUIZ-02).
     *
     * Soal kini dikelompokkan per year_id (year_id WAJIB diisi, R-ERAQUIZ baru
     * — lihat migration era_quiz_questions). Total soal gabungan minimal 20
     * (10 per year x 2 year) supaya randomize 20 soal saat user mengerjakan
     * selalu terpenuhi (syarat publish baru EraQuiz::canPublish()) — beda
     * dari versi lama yang cuma 10 soal flat tanpa year_id.
     */
    /**
     * REVISI TOTAL: kuis sumatif era TIDAK LAGI punya bank soal sendiri —
     * soal ditarik otomatis dari kuis FORMATIF (quiz_questions) tiap year
     * saat user mengerjakan (lihat EraQuiz::randomQuestions()). Seeder ini
     * cukup memastikan record EraQuiz ada, lalu publish OTOMATIS kalau
     * seluruh year di era ini sudah punya kuis formatif published (yang
     * sudah dijamin oleh seedCacarYear()/seedCovidYear() via QuizSeeder,
     * masing-masing 10 soal lengkap).
     */
    private function seedEraQuiz(Era $era): void
    {
        $eraQuiz = EraQuiz::firstOrCreate(
            ['era_id' => $era->id],
            ['is_published' => false]
        );

        if ($eraQuiz->fresh()->canPublish()) {
            $eraQuiz->update(['is_published' => true]);
        }
    }


    /**
     * Buat/replace Rangkuman Interaktif (7 poin correct-statement) untuk
     * satu year. Mirror pola createSections()/seedEraQuiz() — hapus data
     * lama lalu buat ulang, supaya seeder aman dijalankan berkali-kali
     * (idempotent lewat updateOrCreate di level year_summaries).
     *
     * @param array<int, array{options: array<int, string>, correct: int}> $points
     *   Tepat 7 item wajib diberikan (divalidasi runtime di bawah, bukan
     *   cuma di aplikasi admin) — tiap item wajib tepat 3 'options', dan
     *   'correct' adalah index (0-2) opsi yang berisi kalimat rangkuman
     *   asli (bukan pengecoh).
     */
    private function createYearSummary(Year $year, array $points): void
    {
        if (count($points) !== 7) {
            throw new \InvalidArgumentException(
                "Rangkuman Interaktif year #{$year->id} harus tepat 7 poin, diberikan " . count($points) . '.'
            );
        }

        $yearSummary = YearSummary::updateOrCreate(
            ['year_id' => $year->id],
            [] // is_published diset di akhir method setelah 7 poin & opsinya lengkap
        );

        // Hapus poin lama dulu (cascade menghapus year_summary_point_options
        // ikutannya lewat foreign key) supaya seeder idempotent kalau
        // dijalankan ulang dengan isi poin yang berbeda.
        $yearSummary->points()->delete();

        foreach ($points as $index => $pointData) {
            if (count($pointData['options']) !== 3) {
                throw new \InvalidArgumentException(
                    "Poin ke-" . ($index + 1) . " year #{$year->id} harus tepat 3 opsi, diberikan " . count($pointData['options']) . '.'
                );
            }

            $point = YearSummaryPoint::create([
                'year_summary_id' => $yearSummary->id,
                'order' => $index + 1,
            ]);

            $optionsToCreate = [];
            foreach ($pointData['options'] as $optIndex => $optionText) {
                $optionsToCreate[] = [
                    'year_summary_point_id' => $point->id,
                    'option_text' => $optionText,
                    'is_correct' => $optIndex === $pointData['correct'],
                    'order' => $optIndex + 1,
                ];
            }
            YearSummaryPointOption::insert($optionsToCreate);
        }

        // R-SUM-03: tepat 7 poin sudah dijamin di atas, tiap poin tepat 3
        // opsi dengan tepat 1 benar juga sudah dijamin — canPublish() di
        // sini murni double-check sesuai konvensi Quiz::canPublish()/
        // EraQuiz::canPublish() yang sudah ada, bukan syarat tambahan baru.
        if ($yearSummary->fresh()->canPublish()) {
            $yearSummary->update(['is_published' => true]);
        }
    }

    /**
     * @param array<int, array{title: string, header_image: ?string, blocks: array<int, array{type: string, content: string, caption: ?string, order: int}>}> $sections
     */
    private function createSections(Year $year, array $sections): void
    {
        foreach ($sections as $index => $sectionData) {
            $section = Section::updateOrCreate(
                ['year_id' => $year->id, 'title' => $sectionData['title']],
                [
                    'order' => $index + 1,
                    'is_published' => true,
                    'header_image' => $sectionData['header_image'] ?? null,
                ]
            );

            $section->contentBlocks()->delete();
            $section->contentBlocks()->createMany($sectionData['blocks']);
        }
    }
}