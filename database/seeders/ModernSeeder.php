<?php

namespace Database\Seeders;

use App\Models\Era;
use App\Models\EraQuiz;
use App\Models\EraQuizQuestion;
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
        $this->seedEraQuiz($era);

        $this->command?->info('ModernSeeder selesai: year Cacar (1974) + year COVID-19 (2020) real, kuis sumatif era (10 soal) ter-publish.');
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
                'summary_image' => 'https://drive.google.com/file/d/19UKxw51L-sd9uTFbBjJtpFFn3gn4g6BE/view?usp=drive_link',
                'quote_text' => '"Eradikasi cacar adalah bukti bahwa kerja sama global dan kemauan politik bisa mengalahkan penyakit yang pernah membunuh jutaan orang." — [Perlu verifikasi: cek ulang sumber/atribusi kutipan asli sebelum publish, mis. dari WHO atau tokoh kesehatan terkait program eradikasi cacar.]',
                'references' => [
                    'World Health Organization, "Smallpox Eradication Programme" — [Perlu verifikasi: lengkapi tahun terbit & tautan resmi.]',
                    'Kementerian Kesehatan RI, dokumentasi program eradikasi cacar 1974 — [Perlu verifikasi: cari dokumen/arsip resmi yang bisa dirujuk.]',
                ],
            ]
        );

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
                'summary_image' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_SUMMARY_2020/view', // TODO: ganti infografis asli
                'quote_text' => '[Placeholder] "Pandemi mengajarkan kita bahwa kesehatan satu orang adalah urusan bersama." — ganti dengan kutipan asli (mis. dari pejabat kesehatan/tokoh terkait penanganan COVID-19).',
                'references' => [
                    '[Placeholder] Kementerian Kesehatan RI, Pedoman Pencegahan dan Pengendalian COVID-19.',
                    '[Placeholder] Satuan Tugas Penanganan COVID-19, laporan perkembangan kasus nasional.',
                    '[Placeholder] WHO Indonesia, situation report COVID-19.',
                ],
            ]
        );

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
     * 10 soal pilihan ganda tematik seputar isi 2 year di atas, masing-masing
     * sudah lengkap is_correct + explanation_correct + explanation_incorrect
     * supaya EraQuiz::canPublish() lolos dan kuis langsung di-publish di sini
     * (beda dari seedCacarYear/seedCovidYear yang quiz year-nya sengaja
     * dibiarkan draft — kuis sumatif ini sengaja langsung siap tampil untuk
     * kebutuhan testing end-to-end roadmap era & flow submit->hasil->rekap).
     */
    private function seedEraQuiz(Era $era): void
    {
        $eraQuiz = EraQuiz::firstOrCreate(
            ['era_id' => $era->id],
            ['is_published' => false]
        );

        $questions = [
            [
                'question' => 'Pada tahun berapa Indonesia dinyatakan bebas dari penyakit cacar (smallpox)?',
                'options' => ['1974', '1980', '1969', '1990'],
                'correct' => 0,
                'explanation_correct' => 'Benar! Indonesia dinyatakan bebas cacar pada tahun 1974, mendahului deklarasi eradikasi cacar global oleh WHO pada tahun 1980.',
                'explanation_incorrect' => 'Kurang tepat. Indonesia dinyatakan bebas cacar pada tahun 1974 — 1980 adalah tahun WHO mendeklarasikan cacar telah diberantas sepenuhnya secara global, bukan tahun Indonesia bebas cacar.',
            ],
            [
                'question' => 'Organisasi internasional apa yang mencanangkan program eradikasi cacar secara global pada dekade 1960-an?',
                'options' => ['UNICEF', 'World Health Organization (WHO)', 'PBB', 'Palang Merah Internasional'],
                'correct' => 1,
                'explanation_correct' => 'Benar! WHO mencanangkan program eradikasi cacar global dengan strategi vaksinasi massal dan surveillance and containment.',
                'explanation_incorrect' => 'Kurang tepat. Program eradikasi cacar global dicanangkan oleh World Health Organization (WHO), bukan lembaga tsb.',
            ],
            [
                'question' => 'Apa strategi utama yang digunakan dalam program eradikasi cacar di Indonesia?',
                'options' => [
                    'Karantina wilayah total',
                    'Vaksinasi massal dan pengawasan kasus ketat (surveillance and containment)',
                    'Penutupan seluruh fasilitas kesehatan',
                    'Larangan mobilitas antar pulau',
                ],
                'correct' => 1,
                'explanation_correct' => 'Benar! Strategi utamanya adalah vaksinasi massal dipadukan dengan pengawasan kasus yang ketat, dijalankan tenaga kesehatan hingga ke pelosok desa.',
                'explanation_incorrect' => 'Kurang tepat. Strategi utamanya adalah vaksinasi massal dan pengawasan kasus ketat (surveillance and containment), bukan opsi tsb.',
            ],
            [
                'question' => 'Kapan kasus pertama COVID-19 diumumkan secara resmi oleh pemerintah Indonesia?',
                'options' => ['Januari 2020', 'Maret 2020', 'Desember 2019', 'Juni 2020'],
                'correct' => 1,
                'explanation_correct' => 'Benar! Kasus pertama COVID-19 diumumkan resmi oleh pemerintah Indonesia pada awal Maret 2020.',
                'explanation_incorrect' => 'Kurang tepat. Kasus pertama COVID-19 di Indonesia diumumkan resmi pada awal Maret 2020, bukan pada waktu tsb.',
            ],
            [
                'question' => 'Kebijakan apa yang diterapkan pemerintah Indonesia untuk menekan penyebaran COVID-19 di awal pandemi?',
                'options' => [
                    'PSBB (Pembatasan Sosial Berskala Besar)',
                    'Karantina wilayah permanen',
                    'Penutupan seluruh perbatasan negara tanpa batas waktu',
                    'Lockdown militer',
                ],
                'correct' => 0,
                'explanation_correct' => 'Benar! Pemerintah menerapkan PSBB, kemudian dilanjutkan dengan PPKM, untuk menekan laju penularan COVID-19.',
                'explanation_incorrect' => 'Kurang tepat. Kebijakan yang diterapkan adalah PSBB (Pembatasan Sosial Berskala Besar), bukan opsi tsb.',
            ],
            [
                'question' => 'Sejak kapan program vaksinasi nasional COVID-19 mulai dijalankan secara bertahap di Indonesia?',
                'options' => ['Maret 2020', 'Januari 2021', 'Desember 2021', 'Agustus 2020'],
                'correct' => 1,
                'explanation_correct' => 'Benar! Program vaksinasi nasional COVID-19 mulai dijalankan bertahap sejak Januari 2021, diprioritaskan bagi tenaga kesehatan.',
                'explanation_incorrect' => 'Kurang tepat. Program vaksinasi nasional COVID-19 mulai dijalankan bertahap sejak Januari 2021, bukan pada waktu tsb.',
            ],
            [
                'question' => 'Kelompok mana yang menjadi prioritas pertama penerima vaksin COVID-19 di Indonesia?',
                'options' => ['Lansia', 'Tenaga kesehatan', 'Pelajar', 'Pekerja pabrik'],
                'correct' => 1,
                'explanation_correct' => 'Benar! Tenaga kesehatan menjadi kelompok prioritas pertama karena berada di garis depan penanganan pandemi.',
                'explanation_incorrect' => 'Kurang tepat. Prioritas pertama penerima vaksin COVID-19 adalah tenaga kesehatan, sebelum diperluas ke lansia dan kelompok lain.',
            ],
            [
                'question' => 'Vaksin COVID-19 manakah yang menjadi vaksin PERTAMA digunakan dalam program vaksinasi nasional Indonesia?',
                'options' => ['Pfizer-BioNTech', 'Moderna', 'Sinovac', 'AstraZeneca'],
                'correct' => 2,
                'explanation_correct' => 'Benar! Sinovac menjadi vaksin pertama yang digunakan dalam program vaksinasi nasional COVID-19 Indonesia, mulai didistribusikan sejak Januari 2021.',
                'explanation_incorrect' => 'Kurang tepat. Vaksin pertama yang digunakan dalam program vaksinasi nasional Indonesia adalah Sinovac, bukan opsi tsb.',
            ],
            [
                'question' => 'Vaksin COVID-19 manakah yang menggunakan teknologi berbasis vektor adenovirus?',
                'options' => ['Sinovac', 'AstraZeneca', 'Pfizer-BioNTech', 'Moderna'],
                'correct' => 1,
                'explanation_correct' => 'Benar! AstraZeneca menggunakan teknologi berbasis vektor adenovirus, dikembangkan bersama Universitas Oxford.',
                'explanation_incorrect' => 'Kurang tepat. Vaksin berbasis vektor adenovirus adalah AstraZeneca, bukan opsi tsb — Pfizer-BioNTech dan Moderna menggunakan teknologi mRNA.',
            ],
            [
                'question' => 'Apa kesamaan antara program eradikasi cacar (1974) dan program vaksinasi COVID-19 di Indonesia?',
                'options' => [
                    'Keduanya sama-sama tidak melibatkan kerja sama internasional',
                    'Keduanya sama-sama mengandalkan vaksinasi berskala besar untuk melindungi masyarakat dari penyakit menular',
                    'Keduanya sama-sama tidak melibatkan tenaga kesehatan',
                    'Keduanya sama-sama hanya berlangsung kurang dari 1 tahun',
                ],
                'correct' => 1,
                'explanation_correct' => 'Benar! Baik eradikasi cacar maupun penanganan COVID-19 sama-sama mengandalkan program vaksinasi berskala besar sebagai kunci utama melindungi masyarakat.',
                'explanation_incorrect' => 'Kurang tepat. Kesamaan utamanya adalah keduanya mengandalkan vaksinasi berskala besar untuk melindungi masyarakat, bukan pada aspek yang disebutkan di opsi tsb.',
            ],
        ];

        foreach ($questions as $index => $q) {
            $question = EraQuizQuestion::updateOrCreate(
                ['era_quiz_id' => $eraQuiz->id, 'question' => $q['question']],
                [
                    'order' => $index + 1,
                    'explanation_correct' => $q['explanation_correct'],
                    'explanation_incorrect' => $q['explanation_incorrect'],
                ]
            );

            $question->options()->delete();

            $optionsToCreate = [];
            foreach ($q['options'] as $optIndex => $optionText) {
                $optionsToCreate[] = [
                    'option_text' => $optionText,
                    'is_correct' => $optIndex === $q['correct'],
                    'order' => $optIndex + 1,
                ];
            }
            $question->options()->createMany($optionsToCreate);
        }

        // R-ERAQUIZ-10: semua soal di atas sudah lengkap explanation_correct
        // & explanation_incorrect, jadi canPublish() otomatis lolos di sini.
        if ($eraQuiz->fresh()->canPublish()) {
            $eraQuiz->update(['is_published' => true]);
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