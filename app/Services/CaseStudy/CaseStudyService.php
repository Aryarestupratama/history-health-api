<?php

namespace App\Services\CaseStudy;

use App\Models\CaseStudy;
use App\Models\Section;
use App\Models\User;
use App\Models\UserCaseStudyAttempt;
use App\Services\Progress\YearCompletionService;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Service untuk fitur Studi Kasus (Problem-Based Learning) — Fase 1.
 *
 * Prinsip desain (lihat progress.md — banner "Revisi Major (rencana)"):
 * - Studi kasus BUKAN entitas terpisah dari sequential unlock — section
 *   ke-8 (type=case_study) tunduk pada gate unlock section yang SAMA
 *   dengan section bacaan biasa (SectionAccessService, di luar service
 *   ini). Service ini TIDAK mengecek ulang "apakah section 8 sudah
 *   unlocked" — itu tanggung jawab layer yang sudah ada untuk section
 *   manapun (dipanggil sebelum controller memanggil method di sini).
 * - Penilaian mode HARD: benar hanya jika slot 1/2/3 diisi persis opsi
 *   dengan correct_rank 1/2/3 (posisi harus sama, bukan sekadar isi benar
 *   di posisi bebas).
 * - Jawaban benar (correct_rank) TIDAK PERNAH dikirim ke response GET user
 *   — hanya dipakai untuk evaluasi di server saat submit().
 * - BEDA PENTING dari YearSummaryService::updatePointOptions(): opsi studi
 *   kasus TIDAK di-delete+recreate saat admin edit, karena
 *   case_study_options direferensikan user_case_study_attempts lewat FK
 *   restrictOnDelete (kalau opsi dihapus lalu dibuat ulang, id-nya berubah
 *   dan attempt lama jadi rusak/orphan). Admin edit di sini SELALU update
 *   in-place ke 5 row yang sama.
 */
class CaseStudyService
{
    /**
     * Batas minimal karakter kolom alasan user (Ruang Keputusan) — usulan
     * dari sesi brainstorming (progress.md, "Detail yang masih terbuka"),
     * BELUM final. Ditaruh sebagai konstanta di sini (bukan hardcode di
     * FormRequest) supaya gampang disesuaikan sekali tempat kalau tim
     * konten/produk memutuskan angka lain.
     */
    public const REASON_MIN_LENGTH = 30;

    public function __construct(
        private YearCompletionService $yearCompletionService,
    ) {
    }

    /**
     * Studi kasus yang published untuk 1 section (type=case_study), atau
     * null kalau belum ada/belum dipublish admin.
     */
    public function getPublishedForSection(Section $section): ?CaseStudy
    {
        return $section->caseStudy()->where('is_published', true)->first();
    }

    /**
     * Dipanggil admin controller (GET /admin/sections/{section}/case-study)
     * — sama pola dengan YearSummaryService::ensureSkeleton(), skeleton
     * di-generate otomatis kalau belum ada sama sekali (bukan ditambah
     * manual satu-satu seperti soal kuis).
     *
     * 3 opsi pertama default correct_rank 1/2/3 (bukan semua null) — sama
     * alasan dengan default is_correct=true pada opsi pertama
     * YearSummaryPoint: supaya kondisi "tepat 1 rank per nilai" tetap
     * konsisten sejak awal dibuat, admin tinggal mengganti judul/deskripsi
     * dan boleh menukar rank lewat updateOptions() kalau perlu susunan lain.
     */
    public function ensureSkeleton(CaseStudy $caseStudy): void
    {
        if ($caseStudy->options()->count() > 0) {
            return;
        }

        $blank = ['title' => '', 'description' => ''];

        $caseStudy->options()->createMany([
            [...$blank, 'order' => 1, 'correct_rank' => 1],
            [...$blank, 'order' => 2, 'correct_rank' => 2],
            [...$blank, 'order' => 3, 'correct_rank' => 3],
            [...$blank, 'order' => 4, 'correct_rank' => null],
            [...$blank, 'order' => 5, 'correct_rank' => null],
        ]);
    }

    /**
     * Update in-place ke 5 opsi yang SUDAH ADA (lihat catatan class-level
     * kenapa tidak delete+recreate). Payload wajib menyertakan `id` tiap
     * opsi (dari GET sebelumnya) — ditolak kalau id tidak persis cocok
     * dengan 5 opsi milik case study ini (tidak boleh kurang/lebih/asing).
     *
     * @param array<int, array{id:int, title:string, description:string, correct_rank:int|null}> $options
     */
    public function updateOptions(CaseStudy $caseStudy, array $options): void
    {
        if (count($options) !== CaseStudy::OPTION_COUNT) {
            throw new InvalidArgumentException('Studi kasus wajib tepat 5 opsi.');
        }

        $ranks = collect($options)
            ->pluck('correct_rank')
            ->filter(fn ($rank) => $rank !== null)
            ->values();

        if ($ranks->count() !== CaseStudy::RANK_SLOTS || $ranks->sort()->values()->all() !== [1, 2, 3]) {
            throw new InvalidArgumentException('Wajib tepat 3 opsi dengan prioritas 1, 2, dan 3 (masing-masing satu), 2 sisanya pengecoh.');
        }

        $existingIds = $caseStudy->options()->pluck('id')->sort()->values();
        $payloadIds = collect($options)->pluck('id')->sort()->values();

        if ($existingIds->all() !== $payloadIds->all()) {
            throw new InvalidArgumentException('Daftar opsi tidak cocok dengan opsi yang sudah ada pada studi kasus ini.');
        }

        $optionsById = $caseStudy->options()->get()->keyBy('id');

        foreach ($options as $option) {
            $optionsById->get($option['id'])->update([
                'title' => $option['title'],
                'description' => $option['description'],
                'correct_rank' => $option['correct_rank'],
            ]);
        }
    }

    /**
     * 5 opsi siap ditampilkan ke user di layar Ruang Keputusan — urutan
     * diacak on-the-fly (selaras R-QUIZ-13-style), correct_rank TIDAK IKUT
     * dikirim sama sekali (lihat catatan class-level).
     *
     * @return array<int, array{id:int, title:string, description:string}>
     */
    public function getOptionsForAttempt(CaseStudy $caseStudy): array
    {
        return $caseStudy->options()
            ->get()
            ->map(fn ($option) => [
                'id' => $option->id,
                'title' => $option->title,
                'description' => $option->description,
            ])
            ->shuffle()
            ->values()
            ->all();
    }

    public function getAttempt(User $user, CaseStudy $caseStudy): ?UserCaseStudyAttempt
    {
        return UserCaseStudyAttempt::query()
            ->where('user_id', $user->id)
            ->where('case_study_id', $caseStudy->id)
            ->first();
    }

    public function hasCompleted(User $user, CaseStudy $caseStudy): bool
    {
        return (bool) $this->getAttempt($user, $caseStudy)?->isCompleted();
    }

    /**
     * Evaluasi & simpan hasil submit — dipanggil baik pengerjaan pertama
     * maupun "Coba lagi" (retry setelah salah). TIDAK ADA endpoint terpisah
     * "evaluasi urutan" — feedback baru muncul di sini, setelah user benar-
     * benar klik Submit (progress.md).
     *
     * Mode HARD: benar hanya jika opsi di slot 1 punya correct_rank=1, slot
     * 2 correct_rank=2, slot 3 correct_rank=3 — posisi harus persis sama.
     *
     * @param array{1:int, 2:int, 3:int} $slotOptionIds keyed 1/2/3 sesuai slot prioritas, wajib 3 id opsi BERBEDA milik case study ini (dicek ulang di sini sebagai lapis kedua meski FormRequest sudah validasi)
     *
     * @return array{is_correct: bool, feedback: string, attempt: UserCaseStudyAttempt}
     */
    public function submit(User $user, CaseStudy $caseStudy, array $slotOptionIds, string $reason): array
    {
        if (mb_strlen(trim($reason)) < self::REASON_MIN_LENGTH) {
            throw new InvalidArgumentException(
                'Alasan/analisis wajib diisi minimal ' . self::REASON_MIN_LENGTH . ' karakter.'
            );
        }

        if (count(array_unique($slotOptionIds)) !== CaseStudy::RANK_SLOTS) {
            throw new InvalidArgumentException('Ketiga slot prioritas wajib diisi opsi yang berbeda-beda.');
        }

        $optionsById = $caseStudy->options()->get()->keyBy('id');

        $selected = [];
        foreach ([1, 2, 3] as $slot) {
            $optionId = $slotOptionIds[$slot] ?? null;
            $option = $optionId ? $optionsById->get($optionId) : null;

            if (! $option) {
                throw new InvalidArgumentException("Slot prioritas {$slot} berisi opsi yang tidak valid untuk studi kasus ini.");
            }

            $selected[$slot] = $option;
        }

        $isCorrect = $selected[1]->correct_rank === 1
            && $selected[2]->correct_rank === 2
            && $selected[3]->correct_rank === 3;

        $attempt = UserCaseStudyAttempt::recordAttempt(
            $user->id,
            $caseStudy->id,
            $slotOptionIds,
            $reason,
            $isCorrect,
        );

        // Feedback di TINGKAT KASUS (2 teks, diisi admin) — bukan per opsi,
        // dan SENGAJA tidak menunjukkan slot mana yang salah (progress.md:
        // "agar tidak jadi tebak-tebakan, arahan datang dari teks admin").
        $feedback = $isCorrect ? $caseStudy->feedback_correct : $caseStudy->feedback_incorrect;

        return [
            'is_correct' => $isCorrect,
            'feedback' => $feedback,
            'attempt' => $attempt,
        ];
    }

    /**
     * Dipanggil controller SETELAH submit() mengembalikan is_correct=true
     * — menandai section studi kasus selesai lewat jalur yang SAMA dengan
     * section bacaan biasa (`user_progress`), lalu mengevaluasi ulang
     * "year completed" & unlock vaksin lewat YearCompletionService yang
     * SAMA dipakai `ProgressController::complete()` — sengaja TIDAK
     * re-implement logic vaksin/year-completed sendiri di sini, supaya
     * cuma ada 1 sumber kebenaran untuk kedua jalur completion (section
     * bacaan biasa maupun studi kasus).
     *
     * Idempotent (firstOrCreate) — aman dipanggil ulang kalau user submit
     * benar lagi di attempt berikutnya (mis. setelah retake yang tetap
     * benar), tidak menghasilkan progress/vaccine-unlock duplikat.
     *
     * PENTING: method ini HANYA boleh dipanggil dari controller submit()
     * studi kasus (setelah isCorrect true) — TIDAK BOLEH dipanggil dari
     * `POST /sections/{section}/complete` biasa. Guard penolakan endpoint
     * biasa untuk section case_study ditegakkan di
     * ProgressController::complete() (lihat Section::isCaseStudy()).
     *
     * @return array{progress: \App\Models\UserProgress, year_completed: bool, newly_unlocked_vaccines: \Illuminate\Support\Collection}
     */
    public function completeSectionIfNeeded(User $user, CaseStudy $caseStudy): array
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($user, $caseStudy) {
            $section = $caseStudy->section;
            $year = $section->year;

            // Sama pola dengan ProgressService::completeSection() —
            // firstOrCreate untuk idempotency, unique(user_id, section_id)
            // di DB jadi safety net-nya.
            $progress = \App\Models\UserProgress::firstOrCreate(
                ['user_id' => $user->id, 'section_id' => $section->id],
                ['completed_at' => now()]
            );

            $newlyUnlockedVaccines = $this->yearCompletionService->checkAndUnlockVaccines($user, $year);

            return [
                'progress' => $progress,
                'year_completed' => $newlyUnlockedVaccines->isNotEmpty() || $this->yearCompletionService->isCompleted($user, $year),
                'newly_unlocked_vaccines' => $newlyUnlockedVaccines,
            ];
        });
    }
}