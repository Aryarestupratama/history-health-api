<?php

namespace App\Services\Content;

class LinkParserService
{
    /**
     * Ekstrak FILE_ID dari berbagai format link Google Drive.
     */
    public function extractDriveFileId(?string $url): ?string
    {
        if (!$url) {
            return null;
        }

        if (preg_match('/\/d\/([a-zA-Z0-9_-]{10,})/', $url, $matches)) {
            return $matches[1];
        }

        if (preg_match('/[?&]id=([a-zA-Z0-9_-]{10,})/', $url, $matches)) {
            return $matches[1];
        }

        return null;
    }

    public function isValidDriveLink(?string $url): bool
    {
        return $this->extractDriveFileId($url) !== null;
    }

    public function toDriveImageUrl(?string $url): ?string
    {
        $fileId = $this->extractDriveFileId($url);

        // FIX: format lama 'uc?export=view' sering gagal dirender langsung
        // di tag <img> -- untuk file tertentu (biasanya di atas ukuran
        // tertentu, atau tipe file yang di-flag Google), Drive menyisipkan
        // halaman interstitial "Google Drive can't scan this file for
        // viruses" alih-alih mengembalikan bytes gambar, sehingga <img>
        // gagal render / muncul icon broken. Format 'thumbnail' (dipakai
        // Google sendiri untuk preview/thumbnail) tidak kena interstitial
        // ini dan konsisten mengembalikan gambar langsung. Parameter
        // 'sz=w1000' membatasi lebar maksimum agar ukuran wajar untuk
        // preview mobile/admin, bukan resolusi asli penuh.
        return $fileId ? "https://drive.google.com/thumbnail?id={$fileId}&sz=w1000" : null;
    }

    public function toDrivePdfEmbedUrl(?string $url): ?string
    {
        $fileId = $this->extractDriveFileId($url);

        return $fileId ? "https://drive.google.com/file/d/{$fileId}/preview" : null;
    }

    /**
     * (Baru) Video kini via Google Drive, bukan lagi YouTube — lihat
     * Architecture.md §4.1 & Rules.md R-CMS-06 (revisi). Format URL embed
     * Drive untuk video sebenarnya identik dengan PDF ('/preview'), tapi
     * dipisah jadi method sendiri (bukan reuse toDrivePdfEmbedUrl()) supaya
     * semantiknya eksplisit di ContentBlock::getResolvedUrlAttribute() dan
     * tidak membingungkan kalau nanti video butuh parameter tambahan
     * (mis. '?autoplay=0') yang tidak relevan untuk PDF.
     */
    public function toDriveVideoEmbedUrl(?string $url): ?string
    {
        $fileId = $this->extractDriveFileId($url);

        return $fileId ? "https://drive.google.com/file/d/{$fileId}/preview" : null;
    }
}