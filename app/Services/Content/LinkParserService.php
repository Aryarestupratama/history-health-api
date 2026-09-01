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
     * Ekstrak VIDEO_ID dari berbagai format link YouTube.
     */
    public function extractYoutubeVideoId(?string $url): ?string
    {
        if (!$url) {
            return null;
        }

        if (preg_match('/youtu\.be\/([a-zA-Z0-9_-]{11})/', $url, $matches)) {
            return $matches[1];
        }

        if (preg_match('/[?&]v=([a-zA-Z0-9_-]{11})/', $url, $matches)) {
            return $matches[1];
        }

        if (preg_match('/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/', $url, $matches)) {
            return $matches[1];
        }

        return null;
    }

    public function isValidYoutubeLink(?string $url): bool
    {
        return $this->extractYoutubeVideoId($url) !== null;
    }

    public function toYoutubeEmbedUrl(?string $url): ?string
    {
        $videoId = $this->extractYoutubeVideoId($url);

        return $videoId ? "https://www.youtube.com/embed/{$videoId}" : null;
    }

    public function toYoutubeThumbnailUrl(?string $url): ?string
    {
        $videoId = $this->extractYoutubeVideoId($url);

        return $videoId ? "https://img.youtube.com/vi/{$videoId}/hqdefault.jpg" : null;
    }
}