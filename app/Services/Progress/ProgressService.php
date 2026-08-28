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
     * Hanya menghitung section yang published.
     */
    public function progressByEra(User $user): \Illuminate\Support\Collection
    {
        return \App\Models\Era::orderBy('order')->get()->map(function ($era) use ($user) {
            $totalPublished = Section::whereHas('year', fn ($q) => $q->where('era_id', $era->id))
                ->published()
                ->count();

            $completed = UserProgress::where('user_id', $user->id)
                ->whereHas('section', function ($q) use ($era) {
                    $q->published()->whereHas('year', fn ($q2) => $q2->where('era_id', $era->id));
                })
                ->count();

            return [
                'era' => $era,
                'completed' => $completed,
                'total' => $totalPublished,
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