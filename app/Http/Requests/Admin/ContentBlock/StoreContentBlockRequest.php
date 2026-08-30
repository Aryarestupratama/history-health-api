<?php

namespace App\Http\Requests\Admin\ContentBlock;

use App\Rules\Content\ValidGoogleDriveLink;
use App\Rules\Content\ValidYoutubeLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContentBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            // Tipe 'summary' dihapus dari daftar valid — rangkuman sudah naik
            // level ke years.summary (Schema.md revisi major, R-YEAR-01).
            'type' => ['required', Rule::in(['text', 'image', 'video', 'pdf'])],

            // 'nullable' (bukan 'required'): WabahWorkspace.jsx (addBlock())
            // sengaja membuat block skeleton dengan content: "" dulu supaya
            // dapat id, baru diisi belakangan lewat updateBlock() (PATCH).
            // Kalau 'required', string kosong ditolak Laravel -> 422
            // "The content field is required." setiap kali admin klik
            // "+ Tambah Blok".
            'content' => ['nullable', 'string', $this->contentRule()],
        ];
    }

    /**
     * Rule dinamis tergantung 'type' yang dikirim.
     */
    protected function contentRule()
    {
        return function ($attribute, $value, $fail) {
            // Content kosong (block skeleton baru) tidak perlu divalidasi
            // sebagai link Drive/YouTube — validasi link baru relevan begitu
            // admin benar-benar mengisi content-nya (lewat PATCH/update).
            if ($value === null || $value === '') {
                return;
            }

            $type = $this->input('type');

            if (in_array($type, ['image', 'pdf'])) {
                (new ValidGoogleDriveLink)->validate($attribute, $value, $fail);
            } elseif ($type === 'video') {
                (new ValidYoutubeLink)->validate($attribute, $value, $fail);
            }
            // type text -> tidak perlu validasi link, bebas teks/HTML
        };
    }
}