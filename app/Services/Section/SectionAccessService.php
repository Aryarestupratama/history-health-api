<?php

namespace App\Services\Section;

use App\Models\Section;
use App\Models\User;
use App\Models\Year;
use App\Services\Progress\YearCompletionService;

class SectionAccessService
{
    public function __construct(
        private YearCompletionService $yearCompletionService,
    ) {
    }

    /**
     * R-YEAR-02/03: cek apakah `year` itu sendiri unlocked bagi user tsb,
     * atau guest ($user = null).
     *
     * - Tahun kronologis pertama (yang punya section published) dalam satu
     *   era selalu terbuka, untuk user maupun guest (R-YEAR-02).
     * - Tahun berikutnya (kronologis) baru terbuka bagi user login jika
     *   tahun sebelumnya di era yang sama sudah "completed" (R-PROG-07).
     * - Guest tidak pernah mendapat unlock lintas tahun sama sekali,
     *   karena tidak ada progress tersimpan (R-YEAR-03).
     */
    public function isYearUnlocked(?User $user, Year $year): bool
    {
        $chronologicalYears = Year::where('era_id', $year->era_id)
            ->whereHas('sections', fn ($q) => $q->published())
            ->orderBy('year')
            ->get();

        $firstYear = $chronologicalYears->first();

        if (! $firstYear || $year->id === $firstYear->id) {
            return true;
        }

        // R-YEAR-03: guest cuma dapat tahun kronologis pertama di era.
        if (! $user) {
            return false;
        }

        $previousYear = $chronologicalYears
            ->where('year', '<', $year->year)
            ->sortByDesc('year')
            ->first();

        if (! $previousYear) {
            return true;
        }

        return $this->yearCompletionService->isCompleted($user, $previousYear);
    }

    /**
     * R-SECT-01/02/03/R-YEAR-04: cek apakah section boleh diakses penuh
     * (unlocked) oleh user tsb, atau oleh guest ($user = null).
     *
     * Urutan evaluasi (R-YEAR-04): lock di level tahun dicek LEBIH DULU —
     * kalau tahunnya sendiri terkunci, section apapun di dalamnya (termasuk
     * section published pertama) ikut terkunci, terlepas urutan section-nya.
     * Baru kalau tahunnya unlocked, lanjut ke evaluasi sequential lock
     * section seperti sebelumnya.
     */
    public function isUnlocked(?User $user, Section $section): bool
    {
        if (! $section->is_published) {
            return false;
        }

        // R-YEAR-04: gate level tahun mendahului gate level section.
        if (! $this->isYearUnlocked($user, $section->year)) {
            return false;
        }

        $publishedSections = $section->year->sections()
            ->published()
            ->orderBy('order')
            ->get();

        $firstSection = $publishedSections->first();

        if (! $firstSection) {
            return false;
        }

        // R-SECT-01/03: section pertama published selalu terbuka (asalkan
        // tahunnya sendiri sudah unlocked, sudah dicek di atas).
        if ($section->id === $firstSection->id) {
            return true;
        }

        // R-SECT-03: guest tidak dapat sequential unlock section sama sekali.
        if (! $user) {
            return false;
        }

        // Cari section published tepat sebelum section ini (order lebih kecil terdekat).
        $previousSection = $publishedSections
            ->where('order', '<', $section->order)
            ->sortByDesc('order')
            ->first();

        if (! $previousSection) {
            return true;
        }

        return $user->progress()
            ->where('section_id', $previousSection->id)
            ->exists();
    }

    /**
     * Status lock/unlock untuk seluruh section published dalam satu year,
     * dipakai untuk response roadmap tahun (Architecture.md §4.7 — Flutter
     * butuh status locked/unlocked per section, bukan hanya completed).
     *
     * @return \Illuminate\Support\Collection<int, array{section: Section, locked: bool, completed: bool}>
     */
    public function statusForYear(?User $user, Year $year): \Illuminate\Support\Collection
    {
        $publishedSections = $year->sections()->published()->orderBy('order')->get();

        $completedSectionIds = $user
            ? $user->progress()->whereIn('section_id', $publishedSections->pluck('id'))->pluck('section_id')
            : collect();

        return $publishedSections->map(function (Section $section) use ($user, $completedSectionIds) {
            return [
                'section' => $section,
                'locked' => ! $this->isUnlocked($user, $section),
                'completed' => $completedSectionIds->contains($section->id),
            ];
        });
    }
}