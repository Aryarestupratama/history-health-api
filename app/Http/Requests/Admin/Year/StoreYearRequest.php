<?php

namespace App\Http\Requests\Admin\Year;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;

class StoreYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'era_id' => 'required|exists:eras,id',
            'year' => 'required|integer',
            'title' => 'required|string|max:255',

            // Field di bawah OPSIONAL saat create — flow "+ Tambah Tahun Baru"
            // (Design.md §4.1) cuma submit era_id/year/title dulu, admin
            // langsung diarahkan ke workspace untuk isi rangkuman/quote/
            // referensi belakangan (tab "Rangkuman & Vaksin").

            // (Revisi) `summary` (teks) diganti `summary_image` (link gdrive
            // infografis) — tidak wajib diisi sebelum section publish, tapi
            // wajib terisi sebelum quiz year tsb bisa di-publish (R-QUIZ-05).
            'summary_image' => ['nullable', 'string', new ValidGoogleDriveLink],

            // (Baru) Quote — 1 teks kutipan per wabah.
            'quote_text' => ['nullable', 'string'],

            // (Baru) Referensi — list teks bebas, mis. daftar pustaka/sumber.
            'references' => ['nullable', 'array'],
            'references.*' => ['string', 'max:500'],
        ];
    }
}