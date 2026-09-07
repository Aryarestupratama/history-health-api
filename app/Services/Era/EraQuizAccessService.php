<?php

namespace App\Services\Era;

use App\Models\Era;
use App\Models\User;
use App\Models\UserEraQuizAttempt;
use App\Services\Progress\YearCompletionService;

class EraQuizAccessService
{
    public function __construct(
        private YearCompletionService $yearCompletionService,
    ) {
    }

    /**
     * R-ERAQUIZ-02: kuis sumatif era muncul/aktif bagi user login hanya
     * setelah SELURUH year yang punya section published dalam era tsb
     * berstatus "completed" (R-PROG-07) oleh user tsb.
     *
     * Guest selalu dianggap tidak unlocked (R-ERAQUIZ-03).
     */
    public function isUnlocked(?User $user, Era $era): bool
    {
        if (! $user) {
            return false;
        }

        $years = $era->years()
            ->whereHas('sections', fn ($q) => $q->published())
            ->get();

        if ($years->isEmpty()) {
            return false;
        }

        return $years->every(
            fn ($year) => $this->yearCompletionService->isCompleted($user, $year)
        );
    }

    /**
     * R-ERAQUIZ-09: status "attempted" — dipakai Flutter untuk render ikon
     * roadmap era: "final boss" (merah besar) kalau belum pernah dikerjakan,
     * berubah jadi centang begitu ada row user_era_quiz_attempts, terlepas
     * berapa kali sudah di-retake (retake tidak menghapus/mereset status ini,
     * lihat R-ERAQUIZ-08).
     */
    public function hasAttempted(User $user, Era $era): bool
    {
        $eraQuiz = $era->eraQuiz;

        if (! $eraQuiz) {
            return false;
        }

        return UserEraQuizAttempt::where('user_id', $user->id)
            ->where('era_quiz_id', $eraQuiz->id)
            ->exists();
    }

    /**
     * Ringkasan status untuk response roadmap era (dipakai bareng dengan
     * SectionAccessService::statusForYear() di endpoint yang sama):
     * - 'locked'    : belum semua year di era ini completed
     * - 'attempted' : sudah unlocked & sudah pernah dikerjakan minimal 1x
     * - 'available' : sudah unlocked, belum pernah dikerjakan
     */
    public function statusFor(?User $user, Era $era): string
    {
        if (! $this->isUnlocked($user, $era)) {
            return 'locked';
        }

        return $this->hasAttempted($user, $era) ? 'attempted' : 'available';
    }
}