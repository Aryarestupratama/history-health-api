<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Response publik konten "Apa itu Wabah". Sengaja tidak mengekspos
 * image_link mentah (raw link Drive) ke Flutter — sama pola dengan
 * VaccineCardResource yang expose photo_url turunan, bukan kolom photo
 * apa adanya (Schema.md §5).
 *
 * Kontennya murni infografis — tidak ada lagi field caption.
 */
class WabahIntroResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'image_url' => $this->image_url,
        ];
    }
}