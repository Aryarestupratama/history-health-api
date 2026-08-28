<?php

namespace App\Services\Section;

use App\Models\Section;
use App\Models\User;

class SectionAccessService
{
    /**
     * R-SECT-01/02/03: cek apakah section boleh diakses penuh (unlocked)
     * oleh user tsb, atau oleh guest ($user = null).
     *
     * - Section published dengan `order` terkecil di year-nya selalu terbuka
     *   (untuk user maupun guest — R-SECT-01/03).
     * - Untuk user login: section berikutnya terbuka jika section published
     *   sebelumnya (order lebih kecil) di year yang sama sudah completed.
     * - Untuk guest: hanya section pertama yang published per year, section
     *   lain selalu locked (guest tidak punya progress tersimpan).
     */
    public function isUnlocked(?User $user, Section $section): bool
    {
        if (! $section->is_published) {
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

        // R-SECT-01/03: section pertama published selalu terbuka, guest termasuk.
        if ($section->id === $firstSection->id) {
            return true;
        }

        // R-SECT-03: guest tidak dapat sequential unlock sama sekali.
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
    public function statusForYear(?User $user, \App\Models\Year $year): \Illuminate\Support\Collection
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