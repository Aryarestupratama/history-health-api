<?php

namespace App\Services\Progress;

use App\Models\User;
use App\Models\UserQuizAttempt;
use App\Models\UserVaccineUnlock;
use App\Models\Year;
use Illuminate\Support\Facades\DB;

class YearCompletionService
{
    /**
     * R-PROG-07: year dinyatakan "completed" oleh user hanya jika:
     * - seluruh section published pada year tsb sudah completed user, DAN
     * - user sudah punya user_quiz_attempts untuk quiz milik year tsb.
     * Dihitung on-the-fly, bukan kolom fisik.
     */
    public function isCompleted(User $user, Year $year): bool
    {
        $publishedSections = $year->sections()->published()->get();

        if ($publishedSections->isEmpty()) {
            return false;
        }

        $completedSectionIds = $user->progress()
            ->whereIn('section_id', $publishedSections->pluck('id'))
            ->pluck('section_id');

        $allSectionsCompleted = $completedSectionIds->count() === $publishedSections->count();

        if (! $allSectionsCompleted) {
            return false;
        }

        $quiz = $year->quiz;

        if (! $quiz) {
            // Belum ada quiz untuk year ini sama sekali — tidak bisa completed.
            return false;
        }

        return UserQuizAttempt::where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->exists();
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