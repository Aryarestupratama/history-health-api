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