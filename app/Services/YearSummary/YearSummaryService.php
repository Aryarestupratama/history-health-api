<?php

namespace App\Services\YearSummary;

use App\Models\User;
use App\Models\UserYearSummaryCompletion;
use App\Models\Year;
use App\Models\YearSummary;
use App\Models\YearSummaryPoint;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Service untuk fitur Rangkuman Interaktif ("correct statement").
 *
 * Prinsip desain (lihat PRD.md §4.3bis SUM-01–06, Schema.md §2.19–2.22,
 * Architecture.md §4.10, Rules.md Bab 11):
 * - TIDAK ADA penyimpanan jawaban per poin — hanya status akhir
 *   (UserYearSummaryCompletion: is_perfect + completed_at) yang disimpan,
 *   dan itu pun BOLEH ditimpa (retake).
 * - Kebenaran jawaban tiap poin (untuk feedback instan) dihitung on-the-fly
 *   dari database tiap request, tidak pernah dipercaya begitu saja dari
 *   payload client — supaya badge "Sempurna!" (cosmetic tapi tetap
 *   ditampilkan sebagai representasi hasil) tidak bisa dipalsukan lewat
 *   payload API, walau konsekuensinya ringan (murni tampilan).
 * - Urutan opsi diacak di sini (response layer), bukan disimpan di DB.
 */
class YearSummaryService
{
    /**
     * Rangkuman Interaktif yang published untuk 1 year, atau null kalau
     * belum ada/belum di-publish admin (berarti user belum bisa mengakses
     * fitur ini sama sekali untuk year tsb).
     */
    public function getPublishedForYear(Year $year): ?YearSummary
    {
        return $year->summary()->where('is_published', true)->first();
    }

    /**
     * 7 poin siap ditampilkan ke user untuk mengerjakan attempt baru
     * ("Kerjakan Ulang" atau pengerjaan pertama) — tiap poin cuma berisi
     * id + 3 opsi (id + teks, urutan diacak), TANPA is_correct sama
     * sekali supaya tidak bocor ke response API.
     *
     * @return Collection<int, array{id:int, order:int, options: array<int, array{id:int, option_text:string}>}>
     */
    public function getPointsForAttempt(YearSummary $yearSummary): Collection
    {
        return $yearSummary->points()
            ->with('options')
            ->get()
            ->map(function (YearSummaryPoint $point) {
                $options = $point->options
                    ->map(fn ($option) => [
                        'id' => $option->id,
                        'option_text' => $option->option_text,
                    ])
                    ->shuffle()
                    ->values();

                return [
                    'id' => $point->id,
                    'order' => $point->order,
                    'options' => $options->all(),
                ];
            });
    }

    /**
     * Cek 1 jawaban poin (SUM-02) — dipanggil tiap user memilih opsi di
     * satu poin, SEBELUM lanjut ke poin berikutnya. Hasilnya TIDAK
     * disimpan ke database sama sekali, murni dihitung & dikembalikan
     * untuk ditampilkan sebagai feedback instan.
     *
     * @return array{is_correct: bool, correct_option: array{id:int, option_text:string}}
     */
    public function checkAnswer(YearSummaryPoint $point, int $selectedOptionId): array
    {
        $options = $point->options;

        $selected = $options->firstWhere('id', $selectedOptionId);
        if (!$selected) {
            throw new InvalidArgumentException("Opsi #{$selectedOptionId} bukan bagian dari poin #{$point->id}.");
        }

        $correct = $options->firstWhere('is_correct', true);

        return [
            'is_correct' => (bool) $selected->is_correct,
            'correct_option' => [
                'id' => $correct->id,
                'option_text' => $correct->option_text,
            ],
        ];
    }

    /**
     * Submit akhir setelah poin ke-7 dijawab (SUM-05/R-SUM-11) — dipanggil
     * baik untuk pengerjaan pertama maupun "Kerjakan Ulang" (overwrite).
     * Server menghitung ULANG kebenaran tiap jawaban dari DB (bukan
     * percaya client), supaya is_perfect akurat.
     *
     * @param array<int, array{point_id:int, option_id:int}> $answers wajib tepat 7 item, 1 per poin (unik point_id)
     */
    public function submitAttempt(User $user, YearSummary $yearSummary, array $answers): UserYearSummaryCompletion
    {
        $points = $yearSummary->points()->with('options')->get()->keyBy('id');

        if ($points->count() !== 7) {
            throw new InvalidArgumentException(
                "Rangkuman Interaktif #{$yearSummary->id} tidak dalam kondisi valid (harus tepat 7 poin, ditemukan {$points->count()})."
            );
        }

        if (count($answers) !== 7) {
            throw new InvalidArgumentException('Jawaban harus mengisi tepat 7 poin.');
        }

        $answeredPointIds = collect($answers)->pluck('point_id')->unique();
        if ($answeredPointIds->count() !== 7 || $answeredPointIds->diff($points->keys())->isNotEmpty()) {
            throw new InvalidArgumentException('Jawaban tidak sesuai dengan 7 poin milik Rangkuman Interaktif ini.');
        }

        $correctCount = 0;

        foreach ($answers as $answer) {
            $point = $points->get($answer['point_id']);
            $selectedOption = $point->options->firstWhere('id', $answer['option_id']);

            if (!$selectedOption) {
                throw new InvalidArgumentException(
                    "Opsi #{$answer['option_id']} bukan bagian dari poin #{$answer['point_id']}."
                );
            }

            if ($selectedOption->is_correct) {
                $correctCount++;
            }
        }

        $isPerfect = $correctCount === 7;

        return UserYearSummaryCompletion::recordCompletion($user->id, $yearSummary->id, $isPerfect);
    }

    /**
     * 7 kalimat benar dirangkai jadi 1 bacaan utuh, urut sesuai `order`
     * poin — dipakai untuk "Rangkuman Lengkap" (SUM-03). Sengaja tidak
     * bergantung pada jawaban user manapun (selalu sama untuk semua user),
     * karena kita tidak menyimpan jawaban per poin.
     *
     * @return array<int, string>
     */
    public function getFullSummaryText(YearSummary $yearSummary): array
    {
        return $yearSummary->points()
            ->with('options')
            ->get()
            ->map(fn (YearSummaryPoint $point) => $point->correctOption()?->option_text)
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Dipanggil dari admin controller (GET /admin/years/{year}/summary) —
     * beda dari kuis (soal ditambah manual satu-satu sampai maks 5),
     * Rangkuman Interaktif SELALU tepat 7 poin x 3 opsi (R-SUM-01/02), jadi
     * skeleton-nya di-generate otomatis sekali di sini kalau belum ada,
     * supaya admin tinggal isi teksnya lewat updatePoint() (bukan create
     * poin baru satu-satu). Idempotent — aman dipanggil berkali-kali.
     */
    public function ensureSkeleton(YearSummary $yearSummary): void
    {
        $existingCount = $yearSummary->points()->count();

        if ($existingCount >= 7) {
            return;
        }

        for ($order = $existingCount + 1; $order <= 7; $order++) {
            $point = $yearSummary->points()->create(['order' => $order]);

            // 3 opsi kosong (option_text '') — admin isi lewat
            // UpdateYearSummaryPointRequest, opsi pertama default is_correct
            // supaya "tepat 1 benar" tetap konsisten dari awal.
            $point->options()->createMany([
                ['option_text' => '', 'is_correct' => true, 'order' => 1],
                ['option_text' => '', 'is_correct' => false, 'order' => 2],
                ['option_text' => '', 'is_correct' => false, 'order' => 3],
            ]);
        }
    }

    /**
     * Dipanggil admin controller untuk mengisi/mengedit 1 poin — replace
     * penuh 3 opsinya (sama pola dengan QuizController::updateQuestion()
     * yang replace penuh opsi soal saat diedit). Validasi "tepat 3 opsi,
     * tepat 1 benar" sudah ditegakkan di FormRequest sebelum method ini
     * dipanggil, tapi tetap dijaga di sini sebagai lapis kedua.
     *
     * @param array<int, array{option_text:string, is_correct:bool}> $options
     */
    public function updatePointOptions(YearSummaryPoint $point, array $options): void
    {
        if (count($options) !== 3) {
            throw new InvalidArgumentException('Setiap poin wajib tepat 3 opsi.');
        }

        $correctCount = collect($options)->where('is_correct', true)->count();
        if ($correctCount !== 1) {
            throw new InvalidArgumentException('Setiap poin wajib tepat 1 opsi yang ditandai benar.');
        }

        $point->options()->delete();

        foreach ($options as $index => $option) {
            $point->options()->create([
                'option_text' => $option['option_text'],
                'is_correct' => $option['is_correct'],
                'order' => $index + 1,
            ]);
        }
    }

    /**
     * Status completion user untuk 1 Rangkuman Interaktif, atau null kalau
     * belum pernah diselesaikan sama sekali (dipakai untuk nentuin apakah
     * UI menampilkan pilihan "Lihat Rangkuman"/"Kerjakan Ulang" atau
     * langsung widget 7 poin kosong).
     */
    public function getCompletion(User $user, YearSummary $yearSummary): ?UserYearSummaryCompletion
    {
        return UserYearSummaryCompletion::query()
            ->where('user_id', $user->id)
            ->where('year_summary_id', $yearSummary->id)
            ->first();
    }

    public function hasCompleted(User $user, YearSummary $yearSummary): bool
    {
        return $this->getCompletion($user, $yearSummary) !== null;
    }

    /**
     * Syarat baru tombol "Kerjakan Kuis" (SUM-06/INFO-05 revisi) —
     * menggantikan syarat lama "sudah buka halaman rangkuman". Dipanggil
     * dari service/logic completion year yang sudah ada (mis.
     * YearCompletionService) sebagai salah satu gate sebelum tombol
     * kuis ditampilkan ke user.
     */
    public function isQuizUnlockedByUser(User $user, Year $year): bool
    {
        $yearSummary = $this->getPublishedForYear($year);

        if (!$yearSummary) {
            return false;
        }

        return $this->hasCompleted($user, $yearSummary);
    }
}