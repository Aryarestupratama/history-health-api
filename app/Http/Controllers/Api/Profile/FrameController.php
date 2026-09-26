<?php

namespace App\Http\Controllers\Api\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateFrameRequest;
use App\Http\Resources\UserResource;

class FrameController extends Controller
{
    /**
     * PATCH /api/profile/frame
     * Pasang/lepas Border SEKALA di foto profil. Validasi "sudah unlocked
     * atau belum" ada di UpdateFrameRequest (menolak 422 kalau user coba
     * equip=true padahal frame_unlocked_at masih null) — controller ini
     * sengaja tipis, cuma forceFill kolom toggle-nya.
     */
    public function update(UpdateFrameRequest $request)
    {
        $request->user()
            ->forceFill(['frame_equipped' => $request->boolean('frame_equipped')])
            ->save();

        return new UserResource($request->user()->fresh());
    }
}