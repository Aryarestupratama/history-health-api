<?php

namespace App\Http\Resources;

use App\Models\UserCaseStudyAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Badge per wabah (Fase 2) — SENGAJA tidak ada model Badge sendiri, resource
 * ini dibangun di atas CaseStudy (badge_name/badge_description/
 * badge_image_url) + status completed user (UserCaseStudyAttempt), sama
 * filosofi "diturunkan" seperti disebut progress.md.
 *
 * BEDA dari VaccineCardResource: badge yang masih locked TETAP mengirim
 * nama & ikon asli (bukan disamarkan "???") — keputusan produk: tampilan
 * locked cukup diredupkan (opacity/greyscale) di sisi Flutter, bukan
 * disembunyikan di response backend.
 */
class BadgeResource extends JsonResource
{
    private ?UserCaseStudyAttempt $attempt = null;

    /**
     * @param  UserCaseStudyAttempt|null  $attempt  attempt user untuk case
     *   study ini. Bisa ada tapi belum completed (mis. sudah submit salah,
     *   belum pernah benar) — cek isCompleted(), bukan sekadar ada/tidaknya
     *   row. Null kalau user belum pernah mencoba studi kasus ini sama
     *   sekali.
     */
    public function withAttempt(?UserCaseStudyAttempt $attempt): static
    {
        $this->attempt = $attempt;

        return $this;
    }

    public function toArray(Request $request): array
    {
        // isCompleted() di sini adalah satu-satunya sumber kebenaran "badge
        // didapat atau belum" (R-CASE-08 — completed_at sticky, tidak akan
        // pernah hilang lagi walau user retake dan salah).
        $isUnlocked = (bool) $this->attempt?->isCompleted();

        // Dot merah / tag "Baru" (fitur baru) — mirror VaccineCard.unseen:
        // hanya relevan untuk badge yang SUDAH unlocked; badge locked tidak
        // pernah dianggap "unseen" (tidak ada yang perlu dilihat).
        // seen_at nullable independen dari completed_at (lihat migration).
        $isUnseen = $isUnlocked && $this->attempt?->seen_at === null;

        $year = $this->section->year;
        $era = $year->era;

        return [
            // id di sini = id case_studies, dipakai Flutter untuk buka
            // detail badge / navigasi balik ke section studi kasusnya kalau
            // perlu (via section_id).
            'id' => $this->id,
            'section_id' => $this->section_id,
            'name' => $this->badge_name,
            'description' => $this->badge_description,
            'icon_url' => $this->badge_image_url,
            'unlocked' => $isUnlocked,
            'unlocked_at' => $isUnlocked ? $this->attempt->completed_at : null,
            'unseen' => $isUnseen,
            'year' => [
                'id' => $year->id,
                'year' => $year->year,
                'title' => $year->title,
            ],
            'era' => [
                'id' => $era->id,
                'name' => $era->name,
                'slug' => $era->slug,
            ],
        ];
    }
}