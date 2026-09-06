<?php

namespace App\Http\Requests\Admin\Section;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;

class StoreSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'year_id' => 'required|exists:years,id',
            'title' => 'required|string|max:255', // tetap wajib — label admin di sidebar Content Studio, walau tidak lagi dirender ke end-user
            'order' => 'nullable|integer|min:1', // jika kosong, auto-assign urutan berikutnya di controller

            // (Baru) Header gambar section — OPSIONAL murni (boleh diisi boleh
            // tidak per section, bukan wajib). Link gdrive, divalidasi format
            // kalau memang diisi.
            'header_image' => ['nullable', 'string', new ValidGoogleDriveLink],

            // is_published TIDAK divalidasi di sini — section baru selalu draft dulu (R-ADMIN-03)
        ];
    }
}