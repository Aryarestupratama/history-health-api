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

            // (Revisi — Rangkuman Interaktif) `summary_image_url` DIHAPUS
            // total — rangkuman wabah bukan lagi 1 link infografis statis,
            // digantikan relasi `summary` (YearSummary, 7 poin
            // correct-statement). Struktur objek ini SENGAJA mirror field
            // 'quiz' di bawah (id + is_published) — Flutter pakai ini buat
            // tahu apakah rangkuman sudah tersedia untuk dibuka, BUKAN buat
            // ambil isi 7 poinnya (itu lewat endpoint terpisah
            // GET /years/{year}/summary, karena opsinya perlu diacak ulang
            // tiap kali attempt dimulai — tidak cocok di-embed statis di sini).
            'year_summary' => $this->whenLoaded('summary', fn () => $this->summary ? [
                'id' => $this->summary->id,
                'is_published' => $this->summary->is_published,
            ] : null),
            // (Baru, SUM-05/06) Status rangkuman SUDAH diselesaikan user yang
            // sedang request (bukan status publish di atas) — dipakai
            // Flutter buat: (1) nentuin tombol "Kerjakan Kuis" boleh tampil
            // atau belum (SUM-06, menggantikan syarat lama "section sudah
            // completed" saja), (2) nentuin halaman Rangkuman nampilin
            // langsung widget 7 poin kosong atau pilihan "Lihat
            // Rangkuman"/"Kerjakan Ulang" (SUM-05). Diisi controller lewat
            // dynamic property $this->year_summary_completed, sama pola
            // dengan 'locked'/'is_completed' di bawah — selalu false untuk
            // guest (tidak pernah punya completion tersimpan).
            'year_summary_completed' => $this->year_summary_completed ?? false,

            // (Baru) Quote — 1 teks kutipan per wabah. null kalau belum diisi.
            'quote_text' => $this->quote_text,

            // (Baru) Referensi — list teks, ditampilkan mirip daftar pustaka.
            // Selalu array (default [] kalau belum diisi, bukan null) supaya
            // Flutter tidak perlu null-check sebelum iterasi.
            'references' => $this->references ?? [],

            // Catatan urutan tampil di Flutter (halaman Rangkuman Wabah):
            // widget 7 poin Rangkuman Interaktif (atau "Rangkuman Lengkap"
            // kalau year_summary_completed true) -> quote_text -> references
            // -> tombol Kuis (kalau year_summary_completed true & quiz
            // is_published).

            // R-YEAR-02/03 (baru): status lock DI LEVEL TAHUN itu sendiri —
            // diset di YearController::index sebelum resource ini dipanggil.
            // Beda dari 'locked' per section di dalam array 'sections' di
            // bawah (section bisa locked walau year-nya sendiri unlocked,
            // karena sequential unlock section masih berlaku di dalamnya).
            'locked' => $this->locked ?? false,
            // R-PROG-07 (dipakai ulang di sini): apakah year ini sudah
            // "completed" oleh user yang sedang request. Selalu false untuk
            // guest (tidak pernah completed karena tidak ada progress).
            'is_completed' => $this->is_completed ?? false,
            // Section published yang sudah di-eager-load oleh
            // YearController::index (relasi 'sections') — dipakai Flutter
            // untuk navigasi roadmap -> detail section tanpa request
            // tambahan per tahun. 'order' disertakan agar Flutter bisa
            // menampilkan urutan section. 'locked'/'completed' (baru) diisi
            // controller lewat SectionAccessService::statusForYear().
            'sections' => $this->whenLoaded('sections', fn () => $this->sections
                ->sortBy('order')
                ->values()
                ->map(fn ($section) => [
                    'id' => $section->id,
                    'title' => $section->title,
                    'order' => $section->order,
                    'locked' => $section->locked ?? true,
                    'completed' => $section->completed ?? false,
                ])
            ),
            // Diturunkan dari koleksi yang sama (bukan query count terpisah
            // lagi) sekarang relasi 'sections' selalu di-load oleh controller.
            'published_sections_count' => $this->whenLoaded(
                'sections',
                fn () => $this->sections->count()
            ),
            // Status kuis year ini — dipakai Flutter untuk
            // menampilkan/menyembunyikan tombol "Kerjakan Kuis" pada
            // halaman Rangkuman Wabah, BERSAMA `year_summary_completed` di
            // atas (tombol baru boleh tampil kalau quiz.is_published DAN
            // year_summary_completed true — SUM-06/R-QUIZ-05 revisi,
            // menggantikan syarat lama yang cukup section completed saja).
            // null jika admin belum membuat quiz sama sekali untuk year ini.
            'quiz' => $this->whenLoaded('quiz', fn () => $this->quiz ? [
                'id' => $this->quiz->id,
                'is_published' => $this->quiz->is_published,
            ] : null),
        ];
    }
}