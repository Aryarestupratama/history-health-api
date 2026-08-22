<?php

namespace App\Services\Progress;

use App\Models\Section;
use App\Models\User;
use App\Models\UserCardUnlock;
use App\Models\UserProgress;
use Illuminate\Support\Facades\DB;

class ProgressService
{
    /**
     * Catat section sebagai selesai dibaca oleh user, lalu unlock semua
     * figure terkait section tsb (jika ada). Idempotent: jika sudah pernah
     * completed, tidak membuat/mengubah apa pun (R-PROG-03).
     *
     * @return array{progress: UserProgress, newly_unlocked: \Illuminate\Support\Collection}
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

            $newlyUnlocked = collect();

            // Hanya jalankan unlock kalau progress ini baru dibuat barusan.
            // Kalau sudah ada sebelumnya (pembacaan ulang), tidak perlu
            // proses unlock lagi — figure yang relevan pasti sudah ter-unlock
            // saat pertama kali completed (R-CARD-03: unlock cukup sekali).
            if ($progress->wasRecentlyCreated) {
                $figureIds = $section->figures()->pluck('figures.id');

                foreach ($figureIds as $figureId) {
                    $unlock = UserCardUnlock::firstOrCreate(
                        ['user_id' => $user->id, 'figure_id' => $figureId],
                        ['unlocked_at' => now()]
                    );

                    if ($unlock->wasRecentlyCreated) {
                        $newlyUnlocked->push($unlock->figure_id);
                    }
                }
            }

            return [
                'progress' => $progress,
                'newly_unlocked' => $newlyUnlocked,
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

        // Cari year berikutnya secara kronologis dalam era yang sama,
        // yang punya section published, dan belum completed user.
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

        // R-PROG-05: fallback — era yang sama sudah tuntas semua,
        // rekomendasikan era lain dengan progress paling rendah (rasio).
        $progressByEra = $this->progressByEra($user)
            ->filter(fn ($p) => $p['era']->id !== $lastEra->id && $p['total'] > 0)
            ->sortBy(fn ($p) => $p['total'] > 0 ? $p['completed'] / $p['total'] : 0);

        $fallbackEra = $progressByEra->first();

        if (! $fallbackEra) {
            return null; // semua era sudah tuntas atau tidak ada era lain
        }

        return ['type' => 'switch_era', 'era' => $fallbackEra['era']];
    }
}