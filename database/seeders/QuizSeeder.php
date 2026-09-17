<?php

namespace Database\Seeders;

use App\Models\Quiz;
use App\Models\Year;
use Illuminate\Database\Seeder;

/**
 * Quiz DUMMY untuk year Cacar (1974) & COVID-19 (2020) di era Modern.
 *
 * Soal-soal di bawah ini dikarang sendiri (bukan dari dokumen sumber),
 * tujuannya murni untuk menguji tampilan quiz di roadmap — silakan
 * diganti/disesuaikan dengan soal final nanti.
 */
class QuizSeeder extends Seeder
{
    public function run(): void
    {
        $yearCacar = Year::where('year', 1974)->first();
        $yearCovid = Year::where('year', 2020)->first();

        if ($yearCacar) {
            $this->seedQuizFor($yearCacar, [
                [
                    'question' => 'Pada tahun berapa Indonesia dinyatakan bebas dari penyakit cacar (smallpox)?',
                    'explanation_correct' => 'Benar! Indonesia dinyatakan bebas cacar pada 1974, hasil dari program eradikasi cacar nasional yang berjalan sejak dekade sebelumnya.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah 1974 — tahun itulah Indonesia resmi dinyatakan bebas dari penyakit cacar (smallpox) setelah program eradikasi nasional.',
                    'options' => [
                        ['text' => '1960', 'is_correct' => false],
                        ['text' => '1974', 'is_correct' => true],
                        ['text' => '1980', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Organisasi internasional apa yang menggagas program eradikasi cacar secara global?',
                    'explanation_correct' => 'Tepat! WHO (World Health Organization) menggagas dan mengoordinasikan program eradikasi cacar secara global, termasuk di Indonesia.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah WHO (World Health Organization) — organisasi inilah yang menggagas dan mengoordinasikan program eradikasi cacar secara global.',
                    'options' => [
                        ['text' => 'WHO (World Health Organization)', 'is_correct' => true],
                        ['text' => 'UNICEF', 'is_correct' => false],
                        ['text' => 'Palang Merah Internasional', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Apa strategi utama yang digunakan dalam program eradikasi cacar?',
                    'explanation_correct' => 'Benar! Strategi utamanya adalah vaksinasi massal yang disertai pengawasan kasus secara ketat, sehingga penyebaran virus bisa dipantau dan dihentikan.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah vaksinasi massal disertai pengawasan kasus yang ketat — kombinasi inilah yang menjadi strategi utama program eradikasi cacar.',
                    'options' => [
                        ['text' => 'Karantina wilayah total tanpa vaksinasi', 'is_correct' => false],
                        ['text' => 'Vaksinasi massal disertai pengawasan kasus yang ketat', 'is_correct' => true],
                        ['text' => 'Isolasi mandiri tanpa program vaksinasi', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Virus apa yang menyebabkan penyakit cacar (smallpox)?',
                    'explanation_correct' => 'Benar! Cacar disebabkan oleh virus variola, salah satu virus paling mematikan sepanjang sejarah manusia sebelum berhasil diberantas.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah virus variola — virus inilah penyebab penyakit cacar (smallpox).',
                    'options' => [
                        ['text' => 'Virus variola', 'is_correct' => true],
                        ['text' => 'Virus vaccinia', 'is_correct' => false],
                        ['text' => 'Virus varicella', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Metode pemberian vaksin cacar yang umum digunakan pada masa itu adalah?',
                    'explanation_correct' => 'Tepat! Skarifikasi (goresan kulit dengan jarum bercabang) adalah metode yang umum digunakan untuk memberikan vaksin cacar pada masa itu.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah skarifikasi (goresan kulit dengan jarum bercabang) — metode inilah yang umum digunakan untuk vaksin cacar pada masa itu.',
                    'options' => [
                        ['text' => 'Suntikan intravena', 'is_correct' => false],
                        ['text' => 'Skarifikasi (goresan kulit dengan jarum bercabang)', 'is_correct' => true],
                        ['text' => 'Tetes oral', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Pada tahun berapa WHO mendeklarasikan cacar telah diberantas sepenuhnya secara global?',
                    'explanation_correct' => 'Benar! WHO mendeklarasikan cacar berhasil diberantas sepenuhnya secara global pada 1980, beberapa tahun setelah Indonesia sendiri dinyatakan bebas cacar.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah 1980 — tahun itulah WHO mendeklarasikan cacar telah diberantas sepenuhnya secara global.',
                    'options' => [
                        ['text' => '1974', 'is_correct' => false],
                        ['text' => '1980', 'is_correct' => true],
                        ['text' => '1990', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Siapa yang berperan penting menjangkau desa-desa terpencil dalam program vaksinasi cacar di Indonesia?',
                    'explanation_correct' => 'Tepat! Tenaga kesehatan & juru imunisasi lapangan berperan penting menjangkau desa-desa terpencil, termasuk wilayah kepulauan yang sulit diakses.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah tenaga kesehatan & juru imunisasi lapangan — merekalah yang berperan penting menjangkau desa-desa terpencil dalam program ini.',
                    'options' => [
                        ['text' => 'Tenaga kesehatan & juru imunisasi lapangan', 'is_correct' => true],
                        ['text' => 'Aparat militer semata', 'is_correct' => false],
                        ['text' => 'Relawan asing tanpa pelatihan medis', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Apa tantangan geografis utama yang dihadapi program eradikasi cacar di Indonesia?',
                    'explanation_correct' => 'Benar! Kondisi geografis Indonesia yang berupa kepulauan luas menjadi tantangan utama menjangkau seluruh wilayah untuk vaksinasi & pengawasan kasus.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah kondisi geografis kepulauan yang luas — inilah tantangan utama menjangkau seluruh wilayah dalam program ini.',
                    'options' => [
                        ['text' => 'Kondisi geografis kepulauan yang luas', 'is_correct' => true],
                        ['text' => 'Kurangnya minat masyarakat kota besar', 'is_correct' => false],
                        ['text' => 'Cuaca yang selalu ekstrem sepanjang tahun', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Apa dampak positif utama setelah Indonesia dinyatakan bebas cacar pada 1974?',
                    'explanation_correct' => 'Tepat! Beban penyakit menular mematikan berkurang signifikan, dan sumber daya kesehatan bisa dialihkan ke program kesehatan masyarakat lainnya.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah berkurangnya beban penyakit menular mematikan, sehingga sumber daya kesehatan bisa dialihkan ke program lain.',
                    'options' => [
                        ['text' => 'Berkurangnya beban penyakit menular mematikan', 'is_correct' => true],
                        ['text' => 'Meningkatnya jumlah penyakit menular baru', 'is_correct' => false],
                        ['text' => 'Dihentikannya seluruh program imunisasi nasional', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Apa yang dimaksud dengan istilah "ring vaccination" dalam strategi eradikasi cacar?',
                    'explanation_correct' => 'Benar! Ring vaccination adalah strategi memvaksinasi orang-orang di sekitar kasus yang ditemukan untuk membentuk "cincin" kekebalan dan mencegah penyebaran lebih luas.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah strategi memvaksinasi orang-orang di sekitar kasus yang ditemukan untuk membentuk "cincin" kekebalan, bukan vaksinasi acak tanpa target wilayah.',
                    'options' => [
                        ['text' => 'Vaksinasi acak tanpa target wilayah tertentu', 'is_correct' => false],
                        ['text' => 'Memvaksinasi orang-orang di sekitar kasus untuk membentuk "cincin" kekebalan', 'is_correct' => true],
                        ['text' => 'Vaksinasi hanya untuk kalangan pejabat pemerintah', 'is_correct' => false],
                    ],
                ],
            ]);
        }

        if ($yearCovid) {
            $this->seedQuizFor($yearCovid, [
                [
                    'question' => 'Kapan kasus pertama COVID-19 diumumkan resmi di Indonesia?',
                    'explanation_correct' => 'Benar! Pemerintah Indonesia mengumumkan kasus pertama COVID-19 pada Maret 2020.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah Maret 2020 — bulan itulah pemerintah Indonesia mengumumkan resmi kasus pertama COVID-19.',
                    'options' => [
                        ['text' => 'Januari 2020', 'is_correct' => false],
                        ['text' => 'Maret 2020', 'is_correct' => true],
                        ['text' => 'Juni 2020', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Vaksin apa yang pertama kali digunakan dalam program vaksinasi nasional COVID-19 di Indonesia?',
                    'explanation_correct' => 'Tepat! Sinovac adalah vaksin pertama yang digunakan dalam program vaksinasi nasional COVID-19 di Indonesia.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah Sinovac — vaksin inilah yang pertama kali digunakan dalam program vaksinasi nasional COVID-19 di Indonesia.',
                    'options' => [
                        ['text' => 'Sinovac', 'is_correct' => true],
                        ['text' => 'Moderna', 'is_correct' => false],
                        ['text' => 'Pfizer-BioNTech', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Manakah pasangan vaksin yang menggunakan teknologi mRNA?',
                    'explanation_correct' => 'Benar! Pfizer-BioNTech dan Moderna sama-sama menggunakan teknologi mRNA, berbeda dari Sinovac (inactivated virus) atau AstraZeneca (viral vector).',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah Pfizer-BioNTech dan Moderna — keduanya menggunakan teknologi mRNA, berbeda dari Sinovac maupun AstraZeneca.',
                    'options' => [
                        ['text' => 'Sinovac dan AstraZeneca', 'is_correct' => false],
                        ['text' => 'Pfizer-BioNTech dan Moderna', 'is_correct' => true],
                        ['text' => 'AstraZeneca dan Sinovac', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Kebijakan apa yang diterapkan pemerintah untuk menekan penyebaran COVID-19 di awal pandemi?',
                    'explanation_correct' => 'Tepat! PSBB (Pembatasan Sosial Berskala Besar) adalah kebijakan utama pemerintah di awal pandemi untuk menekan penyebaran COVID-19.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah PSBB (Pembatasan Sosial Berskala Besar) — kebijakan inilah yang diterapkan pemerintah di awal pandemi, bukan larangan total tanpa pengecualian.',
                    'options' => [
                        ['text' => 'PSBB (Pembatasan Sosial Berskala Besar)', 'is_correct' => true],
                        ['text' => 'Larangan total pergerakan tanpa pengecualian', 'is_correct' => false],
                        ['text' => 'Penutupan seluruh fasilitas kesehatan', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Sejak kapan program vaksinasi nasional COVID-19 mulai dijalankan secara bertahap di Indonesia?',
                    'explanation_correct' => 'Benar! Program vaksinasi nasional COVID-19 mulai dijalankan secara bertahap sejak Januari 2021, diprioritaskan bagi tenaga kesehatan.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah Januari 2021 — bulan itulah program vaksinasi nasional COVID-19 mulai dijalankan secara bertahap di Indonesia.',
                    'options' => [
                        ['text' => 'Maret 2020', 'is_correct' => false],
                        ['text' => 'Januari 2021', 'is_correct' => true],
                        ['text' => 'Desember 2021', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Kelompok mana yang menjadi prioritas pertama penerima vaksin COVID-19 di Indonesia?',
                    'explanation_correct' => 'Benar! Tenaga kesehatan menjadi kelompok prioritas pertama karena berada di garis depan penanganan pandemi.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah tenaga kesehatan — kelompok inilah yang menjadi prioritas pertama penerima vaksin COVID-19 sebelum diperluas ke kelompok lain.',
                    'options' => [
                        ['text' => 'Lansia', 'is_correct' => false],
                        ['text' => 'Tenaga kesehatan', 'is_correct' => true],
                        ['text' => 'Pelajar', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Vaksin COVID-19 manakah yang menggunakan teknologi berbasis vektor adenovirus?',
                    'explanation_correct' => 'Tepat! AstraZeneca menggunakan teknologi berbasis vektor adenovirus, dikembangkan bersama Universitas Oxford.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah AstraZeneca — vaksin inilah yang menggunakan teknologi berbasis vektor adenovirus, berbeda dari Pfizer-BioNTech dan Moderna yang berbasis mRNA.',
                    'options' => [
                        ['text' => 'Sinovac', 'is_correct' => false],
                        ['text' => 'AstraZeneca', 'is_correct' => true],
                        ['text' => 'Pfizer-BioNTech', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Istilah apa yang digunakan untuk kebijakan pembatasan lanjutan setelah PSBB di Indonesia?',
                    'explanation_correct' => 'Benar! PPKM (Pemberlakuan Pembatasan Kegiatan Masyarakat) adalah istilah kebijakan pembatasan lanjutan yang menggantikan PSBB.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah PPKM (Pemberlakuan Pembatasan Kegiatan Masyarakat) — istilah inilah yang digunakan untuk kebijakan pembatasan lanjutan setelah PSBB.',
                    'options' => [
                        ['text' => 'PPKM (Pemberlakuan Pembatasan Kegiatan Masyarakat)', 'is_correct' => true],
                        ['text' => 'Lockdown total permanen', 'is_correct' => false],
                        ['text' => 'Karantina wilayah tanpa batas waktu', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Apa tujuan utama protokol kesehatan 3M/5M selama pandemi COVID-19?',
                    'explanation_correct' => 'Tepat! Protokol 3M/5M (mencuci tangan, memakai masker, menjaga jarak, dst.) bertujuan menekan laju penularan virus di masyarakat.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah menekan laju penularan virus di masyarakat — itulah tujuan utama protokol kesehatan 3M/5M.',
                    'options' => [
                        ['text' => 'Menekan laju penularan virus di masyarakat', 'is_correct' => true],
                        ['text' => 'Menggantikan kebutuhan vaksinasi sepenuhnya', 'is_correct' => false],
                        ['text' => 'Mempercepat herd immunity tanpa vaksin', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Teknologi apa yang digunakan vaksin Pfizer-BioNTech dan Moderna?',
                    'explanation_correct' => 'Benar! Pfizer-BioNTech dan Moderna sama-sama menggunakan teknologi mRNA, teknologi vaksin generasi baru yang dikembangkan dengan cepat selama pandemi.',
                    'explanation_incorrect' => 'Jawaban yang tepat adalah mRNA — Pfizer-BioNTech dan Moderna menggunakan teknologi ini, bukan opsi tsb.',
                    'options' => [
                        ['text' => 'Inactivated virus', 'is_correct' => false],
                        ['text' => 'mRNA', 'is_correct' => true],
                        ['text' => 'Vektor adenovirus', 'is_correct' => false],
                    ],
                ],
            ]);
        }
    }

    private function seedQuizFor(Year $year, array $questions): void
    {
        $quiz = Quiz::updateOrCreate(
            ['year_id' => $year->id],
            ['is_published' => true]
        );

        $quiz->questions()->delete();

        foreach ($questions as $index => $q) {
            $question = $quiz->questions()->create([
                'order' => $index + 1,
                'question' => $q['question'],
                // R-QUIZ-04/R-QUIZ-10 (revisi terbaru — feedback dipecah 2
                // kolom): kedua kolom ini NOT NULL di DB & wajib diisi
                // sebelum quiz bisa dipublish (Quiz::canPublish()) — seeder
                // ini sengaja langsung publish quiz (is_published: true),
                // jadi keduanya wajib disertakan di sini.
                'explanation_correct' => $q['explanation_correct'],
                'explanation_incorrect' => $q['explanation_incorrect'],
            ]);

            foreach ($q['options'] as $optIndex => $opt) {
                $question->options()->create([
                    'option_text' => $opt['text'],
                    'is_correct' => $opt['is_correct'],
                    'order' => $optIndex + 1,
                ]);
            }
        }
    }
}