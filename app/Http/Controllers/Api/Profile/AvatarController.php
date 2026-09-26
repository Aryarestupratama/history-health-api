<?php

namespace App\Http\Controllers\Api\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateAvatarRequest;
use App\Http\Resources\UserResource;
use App\Services\Profile\AvatarService;
use Illuminate\Http\Request;

class AvatarController extends Controller
{
    public function __construct(private AvatarService $service)
    {
    }

    /**
     * POST /api/profile/avatar
     * Upload foto profil baru — juga dipakai untuk GANTI foto (bukan cuma
     * upload pertama kali), sesuai progress.md ("hapus file lama saat
     * diganti"). Tidak ada endpoint terpisah untuk "ganti".
     */
    public function store(UpdateAvatarRequest $request)
    {
        $this->service->store($request->user(), $request->file('avatar'));

        return new UserResource($request->user()->fresh());
    }

    /**
     * DELETE /api/profile/avatar
     * Hapus foto profil, kembali ke fallback inisial/placeholder di
     * Flutter. Idempotent (lihat AvatarService::delete()).
     */
    public function destroy(Request $request)
    {
        $this->service->delete($request->user());

        return new UserResource($request->user()->fresh());
    }
}