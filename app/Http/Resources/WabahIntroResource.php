<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Response publik konten "Apa itu Wabah" — kini teks biasa, bukan lagi
 * infografis/link Drive, jadi tidak ada lagi accessor turunan untuk
 * dikonversi; field `content` dikirim apa adanya.
 */
class WabahIntroResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'content' => $this->content,
        ];
    }
}