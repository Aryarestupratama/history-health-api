<?php

namespace App\Services\Profile;

use App\Models\CaseStudy;
use App\Models\User;
use App\Models\UserCaseStudyAttempt;

/**
 * (Fase 3 — progress.md) Border SEKALA terbuka permanen begitu user
 * mengumpulkan SEMUA badge dari year yang studi kasusnya published (3 era,
 * tapi dihitung dinamis dari CaseStudy::is_published — BUKAN dihardcode 3,
 * supaya otomatis ikut kalau admin publish studi kasus baru di masa depan).
 *
 * Sumber kebenaran "badge didapat" SAMA dengan yang dipakai BadgeResource:
 * UserCaseStudyAttempt::isCompleted() (completed_at sticky, R-CASE-08) —
 * sengaja tidak query ulang lewat BadgeController supaya cuma ada 1 definisi
 * "badge unlocked" di seluruh codebase.
 *
 * Dipanggil dari CaseStudyService::completeSectionIfNeeded() setiap studi
 * kasus baru selesai (bukan dari cron/job terjadwal) — konsisten dengan
 * pola checkAndUnlockVaccines() yang dipicu event, bukan polling.
 */
class BorderUnlockService
{
    /**
     * @return bool true kalau border BARU SAJA ter-unlock di pemanggilan
     *   ini (berguna untuk trigger notifikasi "Border SEKALA terbuka!" di
     *   Flutter — response controller bisa cek flag ini alih-alih
     *   membandingkan frame_unlocked_at sebelum/sesudah secara manual)
     */
    public function checkAndUnlock(User $user): bool
    {
        // Sticky — sekali terbuka, tidak pernah dievaluasi ulang. Ini juga
        // yang menjaga status tidak hilang walau admin menambah year baru
        // dengan studi kasus baru setelah border sudah terbuka duluan
        // (progress.md: "status terbuka disimpan permanen").
        if ($user->hasFrameUnlocked()) {
            return false;
        }

        $publishedCaseStudyIds = CaseStudy::query()
            ->where('is_published', true)
            ->pluck('id');

        // Belum ada satupun studi kasus published sama sekali — jangan
        // unlock border "gratis" karena syarat (himpunan kosong) kebetulan
        // terpenuhi vacuously.
        if ($publishedCaseStudyIds->isEmpty()) {
            return false;
        }

        $completedCount = UserCaseStudyAttempt::query()
            ->where('user_id', $user->id)
            ->whereIn('case_study_id', $publishedCaseStudyIds)
            ->whereNotNull('completed_at')
            ->count();

        if ($completedCount < $publishedCaseStudyIds->count()) {
            return false;
        }

        $user->forceFill(['frame_unlocked_at' => now()])->save();

        return true;
    }
}