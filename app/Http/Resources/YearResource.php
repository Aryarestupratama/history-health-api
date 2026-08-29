<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class YearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'year' => $this->year,
            'title' => $this->title,
            // R-YEAR-01: rangkuman wabah di level year, null jika belum diisi admin.
            'summary' => $this->summary,
            // Section published yang sudah di-eager-load oleh
            // YearController::index (relasi 'sections') — dipakai Flutter
            // untuk navigasi roadmap -> detail section tanpa request
            // tambahan per tahun. 'order' disertakan agar Flutter bisa
            // menampilkan urutan section & indikator lock tanpa hitung sendiri.
            'sections' => $this->whenLoaded('sections', fn () => $this->sections
                ->sortBy('order')
                ->values()
                ->map(fn ($section) => [
                    'id' => $section->id,
                    'title' => $section->title,
                    'order' => $section->order,
                ])
            ),
            // Diturunkan dari koleksi yang sama (bukan query count terpisah
            // lagi) sekarang relasi 'sections' selalu di-load oleh controller.
            'published_sections_count' => $this->whenLoaded(
                'sections',
                fn () => $this->sections->count()
            ),
            // Status kuis year ini (R-QUIZ-05) — dipakai Flutter untuk
            // menampilkan/menyembunyikan tombol "Kerjakan Kuis" pada
            // halaman Rangkuman Wabah. null jika admin belum membuat quiz
            // sama sekali untuk year ini.
            'quiz' => $this->whenLoaded('quiz', fn () => $this->quiz ? [
                'id' => $this->quiz->id,
                'is_published' => $this->quiz->is_published,
            ] : null),
        ];
    }
}