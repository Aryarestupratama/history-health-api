<?php

namespace Database\Seeders;

use App\Models\CaseStudy;
use App\Models\CaseStudyOption;
use App\Models\Era;
use App\Models\EraQuiz;
use App\Models\Quiz;
use App\Models\Section;
use App\Models\Year;
use App\Models\YearSummary;
use App\Models\YearSummaryPoint;
use App\Models\YearSummaryPointOption;
use Illuminate\Database\Seeder;

/**
 * Seeder DUMMY era Kolonial — dibuat mengikuti pola ModernSeeder.php
 * (Rules.md/Schema.md Fase 1 Studi Kasus), tapi SEMUA konten di sini
 * dummy/karangan sendiri (bukan riset sejarah asli), tujuannya murni
 * supaya era Kolonial bisa DIAKSES & ditest end-to-end (roadmap, 9
 * section/year, studi kasus, kuis formatif per year, kuis sumatif era).
 *
 * Maksimal 2 year sesuai arahan — SENGAJA TIDAK memakai Vaksin sama
 * sekali (tidak ada Vaccine::updateOrCreate() / $year->vaccines()->sync()
 * di file ini), beda dari ModernSeeder yang assign vaksin per year.
 *
 * WAJIB diganti konten asli tim konten sebelum dianggap final/publish
 * beneran — sama status "dummy/lokal" seperti createCaseStudySection()
 * di ModernSeeder.php.
 */
class KolonialSeeder extends Seeder
{
    public function run(): void
    {
        $era = Era::where('slug', 'kolonial')->first();

        if (!$era) {
            $this->command?->warn('Era "kolonial" tidak ditemukan, jalankan EraSeeder dulu.');
            return;
        }

        $this->seedYear($era, 1900, 'Wabah Pes di Hindia Belanda', 'pes');
        $this->seedYear($era, 1920, 'Wabah Kolera di Hindia Belanda', 'kolera');

        $year1 = Year::where('era_id', $era->id)->where('year', 1900)->first();
        $year2 = Year::where('era_id', $era->id)->where('year', 1920)->first();

        if ($year1 && $year2) {
            $this->seedEraQuiz($era);
        } else {
            $this->command?->warn('Year 1900 atau 1920 (era Kolonial) tidak ditemukan, seedEraQuiz dilewati.');
        }

        $this->command?->info('KolonialSeeder selesai (dummy): 2 year (1900, 1920), masing-masing 9 section + studi kasus + kuis formatif 10 soal + Rangkuman 7 poin ter-publish, kuis sumatif era ter-publish, TANPA vaksin.');
    }

    private function seedYear(Era $era, int $yearNumber, string $title, string $topicSlug): void
    {
        $year = Year::updateOrCreate(
            ['era_id' => $era->id, 'year' => $yearNumber],
            [
                'title' => $title,
                'quote_text' => "[Dummy] Kutipan placeholder terkait {$title} — ganti dengan kutipan asli dari sumber sejarah terverifikasi sebelum publish.",
                'references' => [
                    "[Dummy] Referensi placeholder 1 terkait {$title}.",
                    "[Dummy] Referensi placeholder 2 terkait {$title}.",
                ],
            ]
        );

        $this->createYearSummary($year, $title);
        $this->createDummySections($year, $title);
        $this->createCaseStudySection($year, $title, $topicSlug);
        $this->seedQuizFor($year, $title, $topicSlug);
    }

    /**
     * 9 section per year: order 1-7 & 9 dummy bacaan (1 block teks per
     * section, cukup untuk keperluan akses/test — bukan konten final),
     * order 8 SENGAJA dilewati di sini (dipesan untuk case_study, dibuat
     * lewat createCaseStudySection()).
     */
    private function createDummySections(Year $year, string $title): void
    {
        $sections = [];

        foreach (range(1, 7) as $order) {
            $sections[] = [
                'title' => "Dummy Section {$order} — {$title}",
                'order' => $order,
                'header_image' => null,
                'blocks' => [
                    [
                        'type' => 'text',
                        'content' => "[Dummy] Konten section {$order} untuk \"{$title}\" belum ada, ini teks isian sementara untuk keperluan pengembangan lokal.",
                        'caption' => null,
                        'order' => 1,
                    ],
                ],
            ];
        }

        $sections[] = [
            'title' => "Dummy Section 9 (Penutup) — {$title}",
            'order' => 9,
            'header_image' => null,
            'blocks' => [
                [
                    'type' => 'text',
                    'content' => "[Dummy] Konten section penutup (order 9) untuk \"{$title}\" belum ada, ini teks isian sementara untuk keperluan pengembangan lokal.",
                    'caption' => null,
                    'order' => 1,
                ],
            ],
        ];

        foreach ($sections as $sectionData) {
            $section = Section::updateOrCreate(
                ['year_id' => $year->id, 'order' => $sectionData['order']],
                [
                    'title' => $sectionData['title'],
                    'type' => 'reading',
                    'is_published' => true,
                    'header_image' => $sectionData['header_image'],
                ]
            );

            $section->contentBlocks()->delete();
            $section->contentBlocks()->createMany($sectionData['blocks']);
        }
    }

    /**
     * Section order 8 (Section::CASE_STUDY_ORDER) — studi kasus dummy,
     * 5 opsi (3 rank benar + 2 pengecoh), pola sama dengan
     * ModernSeeder::createCaseStudySection().
     */
    private function createCaseStudySection(Year $year, string $title, string $topicSlug): void
    {
        $section = Section::updateOrCreate(
            ['year_id' => $year->id, 'order' => Section::CASE_STUDY_ORDER],
            [
                'title' => "{$title} (Studi Kasus)",
                'type' => 'case_study',
                'is_published' => true,
                'header_image' => null,
            ]
        );

        $caseStudy = CaseStudy::updateOrCreate(
            ['section_id' => $section->id],
            [
                'title' => "Simulasi Respons {$title} (Dummy)",
                'description' => "Dummy: deskripsi studi kasus \"{$title}\" untuk keperluan pengembangan lokal, belum konten final.",
                'challenge_text' => "Dummy: tentukan prioritas upaya pengendalian wabah {$topicSlug} berdasarkan situasi krisis yang disajikan.",
                'reason_description' => 'Dummy: jelaskan singkat alasan urutan prioritas yang kamu pilih.',
                'feedback_correct' => 'Dummy: urutan prioritas yang kamu susun sudah tepat, misi terselesaikan.',
                'feedback_incorrect' => 'Dummy: masih ada urutan prioritas yang belum tepat, coba susun ulang.',
                'badge_name' => "Badge Dummy {$title}",
                'badge_description' => "Dummy: deskripsi badge \"{$title}\", belum final.",
                'badge_image_link' => 'https://drive.google.com/file/d/PLACEHOLDER_BADGE_' . strtoupper($topicSlug) . '/view?usp=drive_link',
            ]
        );

        $caseStudy->options()->delete();

        $optionsToCreate = [];
        $options = [
            ['title' => 'Dummy Opsi A', 'description' => 'Dummy deskripsi opsi A (prioritas 1).', 'correct_rank' => 1],
            ['title' => 'Dummy Opsi B', 'description' => 'Dummy deskripsi opsi B (prioritas 2).', 'correct_rank' => 2],
            ['title' => 'Dummy Opsi C', 'description' => 'Dummy deskripsi opsi C (prioritas 3).', 'correct_rank' => 3],
            ['title' => 'Dummy Opsi D', 'description' => 'Dummy deskripsi opsi D (pengecoh).', 'correct_rank' => null],
            ['title' => 'Dummy Opsi E', 'description' => 'Dummy deskripsi opsi E (pengecoh).', 'correct_rank' => null],
        ];

        if (count($options) !== CaseStudy::OPTION_COUNT) {
            throw new \InvalidArgumentException(
                "Studi kasus year #{$year->id} harus tepat " . CaseStudy::OPTION_COUNT . ' opsi.'
            );
        }

        foreach ($options as $index => $option) {
            $optionsToCreate[] = [
                'case_study_id' => $caseStudy->id,
                'title' => $option['title'],
                'description' => $option['description'],
                'order' => $index + 1,
                'correct_rank' => $option['correct_rank'],
            ];
        }
        CaseStudyOption::insert($optionsToCreate);

        if ($caseStudy->fresh()->canPublish()) {
            $caseStudy->update(['is_published' => true]);
        }
    }

    /**
     * Rangkuman Interaktif (7 poin correct-statement) — dummy, murni
     * supaya YearCompletionService::isQuizUnlocked() terpenuhi dan kuis
     * formatif year bisa diakses (lihat progress.md).
     */
    private function createYearSummary(Year $year, string $title): void
    {
        $points = [];
        foreach (range(1, 7) as $i) {
            $points[] = [
                'options' => [
                    "[Dummy] Pernyataan benar dummy ke-{$i} tentang \"{$title}\".",
                    "[Dummy] Pernyataan pengecoh A dummy ke-{$i} tentang \"{$title}\".",
                    "[Dummy] Pernyataan pengecoh B dummy ke-{$i} tentang \"{$title}\".",
                ],
                'correct' => 0,
            ];
        }

        $yearSummary = YearSummary::updateOrCreate(['year_id' => $year->id], []);
        $yearSummary->points()->delete();

        foreach ($points as $index => $pointData) {
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

        if ($yearSummary->fresh()->canPublish()) {
            $yearSummary->update(['is_published' => true]);
        }
    }

    /**
     * Kuis formatif dummy — TEPAT 10 soal (syarat Quiz::canPublish()),
     * pilihan ganda 3 opsi/soal, 1 benar. Self-contained di sini (TIDAK
     * gantung ke QuizSeeder.php yang khusus era Modern/Cacar/COVID).
     */
    private function seedQuizFor(Year $year, string $title, string $topicSlug): void
    {
        $quiz = Quiz::updateOrCreate(
            ['year_id' => $year->id],
            ['is_published' => true]
        );

        $quiz->questions()->delete();

        foreach (range(1, 10) as $i) {
            $question = $quiz->questions()->create([
                'order' => $i,
                'question' => "[Dummy] Pertanyaan dummy ke-{$i} terkait \"{$title}\"?",
                'explanation_correct' => "[Dummy] Benar! Ini penjelasan dummy untuk soal ke-{$i} terkait {$topicSlug}.",
                'explanation_incorrect' => "[Dummy] Jawaban yang tepat adalah opsi pertama — ini penjelasan dummy untuk soal ke-{$i} terkait {$topicSlug}.",
            ]);

            $question->options()->createMany([
                ['option_text' => "[Dummy] Jawaban benar soal {$i}", 'is_correct' => true, 'order' => 1],
                ['option_text' => "[Dummy] Pengecoh A soal {$i}", 'is_correct' => false, 'order' => 2],
                ['option_text' => "[Dummy] Pengecoh B soal {$i}", 'is_correct' => false, 'order' => 3],
            ]);
        }
    }

    /**
     * Kuis sumatif era — soal ditarik otomatis dari kuis formatif tiap
     * year (EraQuiz::randomQuestions()), sama pola dengan
     * ModernSeeder::seedEraQuiz(). Publish otomatis kalau semua year di
     * era ini sudah punya kuis formatif published (dijamin oleh
     * seedQuizFor() di atas, 10 soal/year).
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
}