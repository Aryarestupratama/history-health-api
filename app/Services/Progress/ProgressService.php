<?php

namespace App\Services\Progress;

use App\Models\Section;
use App\Models\User;
use App\Models\UserProgress;
use Illuminate\Support\Facades\DB;

class ProgressService
{
    public function __construct(
        private YearCompletionService $yearCompletionService,
    ) {
    }

    /**
     * Catat section sebagai selesai dibaca oleh user. Idempotent: jika sudah
     * pernah completed, tidak membuat/mengubah apa pun (R-PROG-03).
     *
     * Tidak lagi unlock vaccine langsung di sini — setelah progress dicatat,
     * status "year completed" dievaluasi ulang (R-PROG-08) via
     * YearCompletionService, karena unlock vaccine sekarang butuh SELURUH
     * section + quiz year tsb selesai, bukan cuma satu section (R-VAC-01).
     *
     * @return array{progress: UserProgress, year_completed: bool, newly_unlocked_vaccines: \Illuminate\Support\Collection}
     */
    public function completeSection(User $user, Section $section): array
    {
        return DB::transaction(function () use ($user, $section) {
            // firstOrCreate menjaga idempotency di level aplikasi;
            // unique constraint (user_id, section_id) di DB adalah safety net-nya.
            $progress = UserProgress::firstOrCreate(
                ['user_id' => $user->id, 'section_id' => $section->id],
                ['completed_at' => now()]
            );

            $year = $section->year;

            $newlyUnlockedVaccines = $this->yearCompletionService->checkAndUnlockVaccines($user, $year);

            return [
                'progress' => $progress,
                'year_completed' => $newlyUnlockedVaccines->isNotEmpty() || $this->yearCompletionService->isCompleted($user, $year),
                'newly_unlocked_vaccines' => $newlyUnlockedVaccines,
            ];
        });
    }

    /**
     * Progress agregat per era untuk user (R-PROG-01, HOME-01).
     *
     * PERBAIKAN: sebelumnya `completed`/`total` di sini menghitung
     * `sections` mentah (bukan `years`) — sementara di seluruh UI Flutter
     * (EraCard, OverallProgressCard, RecommendationCard) angka ini
     * ditampilkan dengan label "X dari Y TAHUN dibaca". Akibatnya kalau
     * satu `year` punya 5 section dan user baru baca 2, tampilannya salah
     * jadi "2 dari 5 tahun dibaca" — padahal seharusnya masih "0 dari N
     * tahun" sampai year tsb benar-benar "completed" (seluruh section +
     * quiz selesai, R-PROG-07).
     *
     * Sekarang `total` = jumlah `years` dalam era yang punya minimal 1
     * section published, dan `completed` = jumlah year tsb yang sudah
     * berstatus "completed" (dihitung via YearCompletionService::isCompleted(),
     * sama seperti sumber kebenaran R-PROG-07/R-VAC-01 lainnya) — supaya
     * granularitasnya konsisten dengan label "tahun dibaca" di semua UI.
     *
     * Catatan performa: isCompleted() dipanggil per-year (N+1 style)
     * karena tiap year butuh cek section+quiz attempt sendiri-sendiri;
     * cukup untuk skala MVP, bisa dioptimasi belakangan kalau jumlah
     * year per era sudah besar.
     */
    public function progressByEra(User $user): \Illuminate\Support\Collection
    {
        return \App\Models\Era::orderBy('order')->get()->map(function ($era) use ($user) {
            $years = \App\Models\Year::where('era_id', $era->id)
                ->whereHas('sections', fn ($q) => $q->published())
                ->get();

            $totalYears = $years->count();

            $completedYears = $years
                ->filter(fn ($year) => $this->yearCompletionService->isCompleted($user, $year))
                ->count();

            return [
                'era' => $era,
                'completed' => $completedYears,
                'total' => $totalYears,
            ];
        });
    }

    /**
     * Rekomendasi bacaan selanjutnya (R-PROG-04, R-PROG-05, HOME-02).
     * Return null jika user belum pernah baca apapun (belum ada last activity).
     */
    public function recommendation(User $user): ?array
    {
        $lastProgress = UserProgress::where('user_id', $user->id)
            ->latest('completed_at')
            ->with('section.year.era')
            ->first();

        if (! $lastProgress) {
            return null;
        }

        $lastEra = $lastProgress->section->year->era;

        $nextYear = \App\Models\Year::where('era_id', $lastEra->id)
            ->where('year', '>', $lastProgress->section->year->year)
            ->whereHas('sections', fn ($q) => $q->published())
            ->whereDoesntHave('sections', function ($q) use ($user) {
                $q->published()->whereHas('progress', fn ($q2) => $q2->where('user_id', $user->id));
            })
            ->orderBy('year')
            ->first();

        if ($nextYear) {
            return ['type' => 'next_year', 'year' => $nextYear, 'era' => $lastEra];
        }

        $progressByEra = $this->progressByEra($user)
            ->filter(fn ($p) => $p['era']->id !== $lastEra->id && $p['total'] > 0)
            ->sortBy(fn ($p) => $p['total'] > 0 ? $p['completed'] / $p['total'] : 0);

        $fallbackEra = $progressByEra->first();

        if (! $fallbackEra) {
            return null;
        }

        return ['type' => 'switch_era', 'era' => $fallbackEra['era']];
    }
}