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

        return $fileId ? "https://drive.google.com/uc?export=view&id={$fileId}" : null;
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