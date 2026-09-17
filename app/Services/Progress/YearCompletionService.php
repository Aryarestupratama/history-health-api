<?php

namespace App\Services\Progress;

use App\Models\User;
use App\Models\UserQuizAttempt;
use App\Models\UserVaccineUnlock;
use App\Models\Year;
use App\Services\YearSummary\YearSummaryService;
use Illuminate\Support\Facades\DB;

class YearCompletionService
{
    public function __construct(
        private YearSummaryService $yearSummaryService,
    ) {
    }

    /**
     * (Baru — SUM-06/INFO-05 revisi) Syarat tombol "Kerjakan Kuis" muncul
     * ke user: seluruh section published pada year tsb sudah completed,
     * DAN Rangkuman Interaktif year tsb sudah diselesaikan user (SUM-06,
     * menggantikan syarat lama "sudah buka halaman rangkuman" yang dulu
     * cukup dengan semua section completed saja).
     *
     * Beda dari isCompleted() di bawah: method ini menentukan kapan tombol
     * kuis BOLEH ditampilkan/kuis boleh DIKERJAKAN, sedangkan isCompleted()
     * menentukan year sudah TUNTAS (setelah kuis-nya juga dikerjakan).
     */
    public function isQuizUnlocked(User $user, Year $year): bool
    {
        if (! $this->allSectionsCompleted($user, $year)) {
            return false;
        }

        return $this->yearSummaryService->isQuizUnlockedByUser($user, $year);
    }

    /**
     * R-PROG-07 (REVISI BESAR): year dinyatakan "completed" oleh user hanya jika:
     * - seluruh section published pada year tsb sudah completed user, DAN
     * - user sudah punya user_quiz_attempts untuk quiz milik year tsb, DAN
     * - attempt TERKINI tsb lulus (skor >= Quiz::PASSING_GRADE_PERCENTAGE, 75%).
     *
     * BEDA dari versi lama: dulu cukup EXISTENCE row user_quiz_attempts
     * (kuis formatif tanpa skor). Sekarang kuis formatif berskor + boleh
     * di-retake (UserQuizAttempt::recordAttempt(), overwrite), jadi user
     * yang gagal (skor < 75%) TIDAK dianggap completed sampai dia
     * mengerjakan ulang dan lulus — attempt lama sudah tertimpa jadi hanya
     * ada 1 row per user per quiz yang selalu mencerminkan hasil TERKINI.
     *
     * Dihitung on-the-fly, bukan kolom fisik.
     */
    public function isCompleted(User $user, Year $year): bool
    {
        if (! $this->allSectionsCompleted($user, $year)) {
            return false;
        }

        $quiz = $year->quiz;

        if (! $quiz) {
            // Belum ada quiz untuk year ini sama sekali — tidak bisa completed.
            return false;
        }

        $attempt = UserQuizAttempt::where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->first();

        return (bool) $attempt?->isPassing();
    }

    /**
     * Helper baru — dipakai controller/resource untuk menentukan status
     * kuis formatif ke Flutter: null (belum pernah dikerjakan sama sekali),
     * attempt dengan isPassing() true (lulus, year completed), atau attempt
     * dengan isPassing() false (sudah dicoba tapi belum lulus, tampilkan
     * tombol "Kerjakan Ulang" alih-alih "Kerjakan Kuis").
     */
    public function latestQuizAttempt(User $user, Year $year): ?\App\Models\UserQuizAttempt
    {
        $quiz = $year->quiz;

        if (! $quiz) {
            return null;
        }

        return \App\Models\UserQuizAttempt::where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->first();
    }

    /**
     * Dipakai bersama oleh isQuizUnlocked() & isCompleted() — dulu logic
     * ini duplikat persis di keduanya, ditarik ke sini biar 1 sumber
     * kebenaran (mis. kalau nanti definisi "section published" berubah).
     */
    private function allSectionsCompleted(User $user, Year $year): bool
    {
        $publishedSections = $year->sections()->published()->get();

        if ($publishedSections->isEmpty()) {
            return false;
        }

        $completedSectionIds = $user->progress()
            ->whereIn('section_id', $publishedSections->pluck('id'))
            ->pluck('section_id');

        return $completedSectionIds->count() === $publishedSections->count();
    }

    /**
     * R-VAC-01/02: dipanggil ulang setiap ada user_progress baru pada section
     * di year tsb ATAU ada user_quiz_attempts baru untuk quiz year tsb
     * (R-PROG-08). Jika year completed, unlock semua vaccine terkait
     * (idempotent — R-VAC-03 unique constraint jadi safety net).
     *
     * @return \Illuminate\Support\Collection vaccine_id yang baru ter-unlock (kosong jika tidak ada perubahan)
     */
    public function checkAndUnlockVaccines(User $user, Year $year): \Illuminate\Support\Collection
    {
        if (! $this->isCompleted($user, $year)) {
            return collect();
        }

        return DB::transaction(function () use ($user, $year) {
            $newlyUnlocked = collect();

            $vaccineIds = $year->vaccines()->pluck('vaccines.id');

            foreach ($vaccineIds as $vaccineId) {
                $unlock = UserVaccineUnlock::firstOrCreate(
                    ['user_id' => $user->id, 'vaccine_id' => $vaccineId],
                    ['unlocked_at' => now()]
                );

                if ($unlock->wasRecentlyCreated) {
                    $newlyUnlocked->push($unlock->vaccine_id);
                }
            }

            return $newlyUnlocked;
        });
    }
}