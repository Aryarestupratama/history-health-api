<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Fase 3 (progress.md): JPG/PNG/WebP maks 2 MB (usulan tim).
            // 'image' saja tidak cukup ketat (loloskan gif/bmp/svg) — pakai
            // whitelist mimes eksplisit sama seperti validasi upload lain
            // di app ini yang menolak format di luar daftar.
            'avatar' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}