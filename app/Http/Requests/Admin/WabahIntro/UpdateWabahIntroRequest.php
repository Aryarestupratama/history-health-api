<?php

namespace App\Http\Requests\Admin\WabahIntro;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;

class UpdateWabahIntroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            // Nullable — admin boleh simpan draft dulu tanpa link Drive
            // (sama pola dengan StoreContentBlockRequest: content skeleton
            // kosong dulu, diisi belakangan). Validasi link Drive baru
            // jalan kalau value-nya memang diisi (bukan null/kosong).
            'image_link' => ['nullable', 'string', new ValidGoogleDriveLink],

            'caption' => ['nullable', 'string'],

            // 'sometimes' — request update caption/image_link saja (tanpa
            // menyertakan is_published) tidak boleh diam-diam mereset
            // status publish jadi false.
            'is_published' => ['sometimes', 'boolean'],
        ];
    }
}