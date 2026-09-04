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
                    'options' => [
                        ['text' => '1960', 'is_correct' => false],
                        ['text' => '1974', 'is_correct' => true],
                        ['text' => '1980', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Organisasi internasional apa yang menggagas program eradikasi cacar secara global?',
                    'options' => [
                        ['text' => 'WHO (World Health Organization)', 'is_correct' => true],
                        ['text' => 'UNICEF', 'is_correct' => false],
                        ['text' => 'Palang Merah Internasional', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Apa strategi utama yang digunakan dalam program eradikasi cacar?',
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
                    'options' => [
                        ['text' => 'Januari 2020', 'is_correct' => false],
                        ['text' => 'Maret 2020', 'is_correct' => true],
                        ['text' => 'Juni 2020', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Vaksin apa yang pertama kali digunakan dalam program vaksinasi nasional COVID-19 di Indonesia?',
                    'options' => [
                        ['text' => 'Sinovac', 'is_correct' => true],
                        ['text' => 'Moderna', 'is_correct' => false],
                        ['text' => 'Pfizer-BioNTech', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Manakah pasangan vaksin yang menggunakan teknologi mRNA?',
                    'options' => [
                        ['text' => 'Sinovac dan AstraZeneca', 'is_correct' => false],
                        ['text' => 'Pfizer-BioNTech dan Moderna', 'is_correct' => true],
                        ['text' => 'AstraZeneca dan Sinovac', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Kebijakan apa yang diterapkan pemerintah untuk menekan penyebaran COVID-19 di awal pandemi?',
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