<?php

namespace App\Services\Profile;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Laravel\Facades\Image;

/**
 * (Fase 3 — progress.md) Upload foto profil ke disk hosting, BUKAN link
 * Google Drive seperti gambar CMS lain (Vaccine::photo_url,
 * CaseStudy::badge_image_url) — infrastruktur upload baru, pola paling
 * dekat dengan file terupload biasa (bukan resolve link eksternal).
 *
 * Catatan dependensi: resize pakai package `intervention/image` (v3,
 * facade Laravel). Kalau package ini belum ter-install di project,
 * `composer require intervention/image intervention/image-laravel` dulu —
 * kalau project pakai library resize lain, ganti pemanggilan resize()
 * di store() saja, kontrak method publik service ini tidak perlu berubah.
 */
class AvatarService
{
    private const DISK = 'public';

    private const DIRECTORY = 'avatars';

    /**
     * Ukuran sisi persegi hasil resize (px) — avatar selalu ditampilkan
     * bulat/persegi kecil di Flutter, tidak perlu simpan resolusi asli.
     */
    private const MAX_DIMENSION = 512;

    /**
     * Simpan foto profil baru untuk $user, hapus file lama (kalau ada)
     * SETELAH file baru berhasil disimpan (supaya kalau proses gagal di
     * tengah, user tidak kehilangan avatar lama begitu saja).
     *
     * @return string avatar_path baru (relatif terhadap disk 'public')
     */
    public function store(User $user, UploadedFile $file): string
    {
        $oldPath = $user->avatar_path;

        $image = Image::read($file)
            ->cover(self::MAX_DIMENSION, self::MAX_DIMENSION);

        $filename = sprintf('%s_%s.webp', $user->id, Str::random(12));
        $path = self::DIRECTORY.'/'.$filename;

        Storage::disk(self::DISK)->put($path, (string) $image->toWebp(quality: 85));

        $user->forceFill(['avatar_path' => $path])->save();

        if ($oldPath && $oldPath !== $path) {
            Storage::disk(self::DISK)->delete($oldPath);
        }

        return $path;
    }

    /**
     * Hapus foto profil user (kalau ada). Idempotent — dipanggil pada user
     * yang belum pernah upload tidak error, cuma no-op.
     */
    public function delete(User $user): void
    {
        if ($user->avatar_path) {
            Storage::disk(self::DISK)->delete($user->avatar_path);
        }

        $user->forceFill(['avatar_path' => null])->save();
    }
}