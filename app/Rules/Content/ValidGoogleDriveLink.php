<?php

namespace App\Rules\Content;

use App\Services\Content\LinkParserService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidGoogleDriveLink implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $parser = app(LinkParserService::class);

        if (!$parser->isValidDriveLink($value)) {
            $fail("Format link Google Drive pada {$attribute} tidak valid atau FILE_ID tidak ditemukan.");
        }
    }
}