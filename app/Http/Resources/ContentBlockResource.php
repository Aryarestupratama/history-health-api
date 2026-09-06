<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContentBlockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'content' => $this->content,       // raw (fallback jika resolved_url null, mis. type=text)
            'resolved_url' => $this->resolved_url, // accessor: direct-view/embed URL utk image/video/pdf
            // (Baru) Caption — opsional, relevan untuk type image/video
            // (sumber/keterangan media). null kalau belum diisi admin.
            'caption' => $this->caption,
            'order' => $this->order,
        ];
    }
}