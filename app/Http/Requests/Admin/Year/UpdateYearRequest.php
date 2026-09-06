<?php

namespace App\Http\Requests\Admin\Year;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;

class UpdateYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'era_id' => 'sometimes|required|exists:eras,id',
            'year' => 'sometimes|required|integer',
            'title' => 'sometimes|required|string|max:255',

            // (Revisi) dulu `summary` (teks polos, 'sometimes|nullable|string'),
            // sekarang `summary_image` — link gdrive infografis, divalidasi
            // format lewat ValidGoogleDriveLink (sama pola dgn image lain).
            // Auto-save di tab "Rangkuman & Vaksin" (WabahWorkspace.jsx)
            // mengandalkan field ini benar-benar masuk ke $request->validated()
            // — jangan sampai lupa didaftarkan lagi di sini (pernah jadi bug
            // silent sebelumnya saat masih bernama `summary`).
            'summary_image' => ['sometimes', 'nullable', 'string', new ValidGoogleDriveLink],

            // (Baru) Quote — 1 teks kutipan per wabah, boleh dikosongkan lagi.
            'quote_text' => ['sometimes', 'nullable', 'string'],

            // (Baru) Referensi — list teks, replace penuh tiap kali disimpan
            // (bukan append) — controller cukup assign langsung ke kolom JSON.
            'references' => ['sometimes', 'nullable', 'array'],
            'references.*' => ['string', 'max:500'],
        ];
    }
}