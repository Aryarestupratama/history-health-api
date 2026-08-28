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
                    'type' => 'multiple_choice',
                    'question' => 'Di mana wabah Flu Spanyol pertama kali terdeteksi menyebar luas di Hindia Belanda?',
                    'options' => [
                        ['text' => 'Pulau Jawa', 'is_correct' => true],
                        ['text' => 'Pulau Kalimantan', 'is_correct' => false],
                        ['text' => 'Pulau Sulawesi', 'is_correct' => false],
                    ],
                ],
                [
                    'type' => 'essay',
                    'question' => 'Menurutmu, apa dampak wabah Flu Spanyol terhadap kebijakan kesehatan publik saat itu?',
                    'correct_answer' => 'Mendorong perhatian lebih besar pemerintah kolonial terhadap sistem kesehatan masyarakat.',
                ],
            ]);
        }

        if ($year2020) {
            $this->seedQuizFor($year2020, [
                [
                    'type' => 'multiple_choice',
                    'question' => 'Kapan kasus pertama COVID-19 diumumkan resmi di Indonesia?',
                    'options' => [
                        ['text' => 'Januari 2020', 'is_correct' => false],
                        ['text' => 'Maret 2020', 'is_correct' => true],
                        ['text' => 'Juni 2020', 'is_correct' => false],
                    ],
                ],
                [
                    'type' => 'essay',
                    'question' => 'Sebutkan satu perubahan kebiasaan masyarakat akibat pandemi COVID-19 yang kamu ingat.',
                    'correct_answer' => null,
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
                'type' => $q['type'],
                'correct_answer' => $q['correct_answer'] ?? null,
            ]);

            if ($q['type'] === 'multiple_choice') {
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
}