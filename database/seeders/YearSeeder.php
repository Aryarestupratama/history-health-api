<?php

namespace Database\Seeders;

use App\Models\Era;
use App\Models\Year;
use Illuminate\Database\Seeder;

class YearSeeder extends Seeder
{
    public function run(): void
    {
        $kolonial = Era::where('slug', 'kolonial')->first();
        $kemerdekaan = Era::where('slug', 'kemerdekaan')->first();
        $modern = Era::where('slug', 'modern')->first();

        $years = [
            // ==================== ERA KOLONIAL ====================
            [
                'era_id' => $kolonial->id,
                'year' => 1888,
                'title' => 'Berdirinya Lembaga Eijkman',
                'summary' => 'Lembaga penelitian penyakit menular didirikan di Batavia dan menjadi cikal bakal riset biomedis modern di Hindia Belanda.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1897,
                'title' => 'Penemuan Vitamin B1 oleh Eijkman',
                'summary' => 'Christiaan Eijkman menemukan hubungan antara beras tumbuk dengan penyakit beri-beri, penelitian yang kelak mengantarkannya meraih Hadiah Nobel.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1902,
                'title' => 'Wabah Pes di Jawa',
                'summary' => 'Wabah pes menyerang wilayah Jawa dan mendorong pemerintah kolonial memperketat program sanitasi serta karantina di pelabuhan-pelabuhan utama.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1911,
                'title' => 'Program Vaksinasi Cacar Diperluas',
                'summary' => 'Pemerintah kolonial memperluas program vaksinasi cacar ke daerah-daerah luar Jawa guna menekan angka kematian akibat penyakit menular.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1918,
                'title' => 'Wabah Flu Spanyol',
                'summary' => 'Flu Spanyol melanda Hindia Belanda pada 1918, menewaskan ratusan ribu jiwa dan mendorong perubahan kebijakan kesehatan publik kolonial.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1924,
                'title' => 'Dibentuknya Dinas Kesehatan Rakyat',
                'summary' => 'Pemerintah kolonial membentuk dinas kesehatan rakyat untuk memperluas layanan kesehatan dasar bagi penduduk pribumi di berbagai daerah.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1927,
                'title' => 'Berdirinya Sekolah Kedokteran STOVIA',
                'summary' => 'STOVIA menjadi cikal bakal pendidikan kedokteran modern di Hindia Belanda sekaligus tempat lahirnya kesadaran pergerakan nasional di kalangan dokter pribumi.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1930,
                'title' => 'Kampanye Pemberantasan Malaria',
                'summary' => 'Program pemberantasan malaria mulai digalakkan di berbagai wilayah perkebunan untuk melindungi tenaga kerja dan penduduk sekitar.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1935,
                'title' => 'Pembangunan Rumah Sakit CBZ Batavia',
                'summary' => 'Rumah Sakit Centrale Burgerlijke Ziekeninrichting dibangun sebagai fasilitas kesehatan rujukan utama di Batavia, cikal bakal RSCM.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1942,
                'title' => 'Krisis Kesehatan Masa Pendudukan Jepang',
                'summary' => 'Pendudukan Jepang membawa kelangkaan obat dan tenaga medis, memperburuk kondisi kesehatan masyarakat di berbagai wilayah Hindia Belanda.',
            ],

            // ==================== ERA KEMERDEKAAN ====================
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1948,
                'title' => 'Wabah Cacar Pasca Kemerdekaan',
                'summary' => 'Di tengah gejolak pasca kemerdekaan, wabah cacar mendorong pemerintah muda RI menjalankan program vaksinasi massal pertama.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1951,
                'title' => 'Berdirinya Kementerian Kesehatan RI',
                'summary' => 'Kementerian Kesehatan Republik Indonesia dibentuk untuk mengonsolidasikan kebijakan kesehatan nasional pasca pengakuan kedaulatan.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1955,
                'title' => 'Program Pemberantasan Malaria Nasional',
                'summary' => 'Indonesia meluncurkan program pemberantasan malaria berskala nasional dengan dukungan organisasi kesehatan internasional.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1959,
                'title' => 'Pendirian Fakultas Kedokteran Baru',
                'summary' => 'Sejumlah fakultas kedokteran baru didirikan di berbagai daerah untuk mengatasi kekurangan tenaga medis di luar Jawa.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1963,
                'title' => 'Wabah Kolera di Sulawesi',
                'summary' => 'Wabah kolera melanda Sulawesi dan sekitarnya, mendorong perbaikan sistem sanitasi dan penyediaan air bersih di wilayah terdampak.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1968,
                'title' => 'Program Puskesmas Pertama',
                'summary' => 'Puskesmas mulai diperkenalkan sebagai ujung tombak layanan kesehatan dasar masyarakat di seluruh Indonesia.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1973,
                'title' => 'Program Keluarga Berencana Nasional',
                'summary' => 'BKKBN memperluas program keluarga berencana sebagai bagian dari strategi kesehatan reproduksi dan pengendalian pertumbuhan penduduk.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1977,
                'title' => 'Program Imunisasi Nasional Dimulai',
                'summary' => 'Pemerintah meluncurkan Program Pengembangan Imunisasi untuk menekan angka kematian bayi akibat penyakit yang dapat dicegah dengan vaksin.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1984,
                'title' => 'Gerakan Posyandu Diluncurkan',
                'summary' => 'Pos Pelayanan Terpadu diperkenalkan sebagai upaya berbasis masyarakat untuk memantau kesehatan ibu dan anak di tingkat desa.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1990,
                'title' => 'Deklarasi Universal Child Immunization',
                'summary' => 'Indonesia mencapai target cakupan imunisasi anak secara nasional sebagai bagian dari komitmen global peningkatan kesehatan anak.',
            ],

            // ==================== ERA MODERN ====================
            // Year pertama (2020) berisi data REAL Pandemi COVID-19 dan
            // di-set sebagai satu-satunya year yang complete penuh sampai
            // quiz & rangkuman (lihat ModernDummySeeder). 9 year setelahnya
            // sengaja dummy — tujuannya menguji apakah year berikutnya baru
            // terbuka setelah year COVID diselesaikan (sequential unlock).
            [
                'era_id' => $modern->id,
                'year' => 2020,
                'title' => 'Pandemi COVID-19',
                'summary' => 'Pandemi COVID-19 mengubah total kebijakan kesehatan Indonesia, mendorong percepatan vaksinasi nasional dan transformasi layanan kesehatan digital.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2021,
                'title' => '[Dummy] Tahun Modern 2021',
                'summary' => 'Konten dummy untuk menguji sequential unlock year setelah year COVID (2020) diselesaikan.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2022,
                'title' => '[Dummy] Tahun Modern 2022',
                'summary' => 'Konten dummy untuk menguji sequential unlock year era Modern.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2023,
                'title' => '[Dummy] Tahun Modern 2023',
                'summary' => 'Konten dummy untuk menguji sequential unlock year era Modern.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2024,
                'title' => '[Dummy] Tahun Modern 2024',
                'summary' => 'Konten dummy untuk menguji sequential unlock year era Modern.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2025,
                'title' => '[Dummy] Tahun Modern 2025',
                'summary' => 'Konten dummy untuk menguji sequential unlock year era Modern.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2026,
                'title' => '[Dummy] Tahun Modern 2026',
                'summary' => 'Konten dummy untuk menguji sequential unlock year era Modern.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2027,
                'title' => '[Dummy] Tahun Modern 2027',
                'summary' => 'Konten dummy untuk menguji sequential unlock year era Modern.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2028,
                'title' => '[Dummy] Tahun Modern 2028',
                'summary' => 'Konten dummy untuk menguji sequential unlock year era Modern.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2029,
                'title' => '[Dummy] Tahun Modern 2029',
                'summary' => 'Konten dummy untuk menguji sequential unlock year era Modern.',
            ],
        ];

        foreach ($years as $year) {
            Year::updateOrCreate(
                ['era_id' => $year['era_id'], 'year' => $year['year']],
                $year
            );
        }
    }
}