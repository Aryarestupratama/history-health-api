<?php

namespace App\Rules\Content;

use App\Services\Content\LinkParserService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidYoutubeLink implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $parser = app(LinkParserService::class);

        if (!$parser->isValidYoutubeLink($value)) {
            $fail("Format link YouTube pada {$attribute} tidak valid atau VIDEO_ID tidak ditemukan.");
        }
    }
}