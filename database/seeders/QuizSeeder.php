<?php

namespace Database\Seeders;

use App\Models\Quiz;
use App\Models\Year;
use Illuminate\Database\Seeder;

class QuizSeeder extends Seeder
{
    public function run(): void
    {
        $year1918 = Year::where('year', 1918)->first();
        $year2020 = Year::where('year', 2020)->first();

        if ($year1918) {
            $this->seedQuizFor($year1918, [
                [
                    'question' => 'Di mana wabah Flu Spanyol pertama kali terdeteksi menyebar luas di Hindia Belanda?',
                    'options' => [
                        ['text' => 'Pulau Jawa', 'is_correct' => true],
                        ['text' => 'Pulau Kalimantan', 'is_correct' => false],
                        ['text' => 'Pulau Sulawesi', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Apa dampak utama wabah Flu Spanyol terhadap kebijakan kesehatan publik pemerintah kolonial saat itu?',
                    'options' => [
                        ['text' => 'Mendorong perhatian lebih besar terhadap sistem kesehatan masyarakat', 'is_correct' => true],
                        ['text' => 'Tidak ada perubahan kebijakan sama sekali', 'is_correct' => false],
                        ['text' => 'Kesehatan publik diserahkan sepenuhnya ke pihak swasta', 'is_correct' => false],
                    ],
                ],
            ]);
        }

        if ($year2020) {
            $this->seedQuizFor($year2020, [
                [
                    'question' => 'Kapan kasus pertama COVID-19 diumumkan resmi di Indonesia?',
                    'options' => [
                        ['text' => 'Januari 2020', 'is_correct' => false],
                        ['text' => 'Maret 2020', 'is_correct' => true],
                        ['text' => 'Juni 2020', 'is_correct' => false],
                    ],
                ],
                [
                    'question' => 'Manakah yang merupakan perubahan kebiasaan masyarakat akibat pandemi COVID-19?',
                    'options' => [
                        ['text' => 'Penerapan protokol kesehatan seperti masker dan jaga jarak', 'is_correct' => true],
                        ['text' => 'Penghapusan total layanan kesehatan daring', 'is_correct' => false],
                        ['text' => 'Larangan penggunaan hand sanitizer', 'is_correct' => false],
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