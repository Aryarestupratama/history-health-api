<?php

namespace App\Http\Requests\Admin\SekalaBorder;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Pola sama `UpdateWabahIntroRequest` — singleton, jadi cuma ada 1
 * FormRequest update (tidak ada Store terpisah, tidak ada gate publish
 * per-item seperti Vaccine/CaseStudy karena tidak ada banyak "item").
 *
 * `image_link` SENGAJA nullable (bukan required) — admin boleh menyimpan
 * `is_published=false` dulu sambil link belum diisi (skeleton kosong),
 * sama filosofi field lain yang wajib terisi baru dicek saat publish,
 * BUKAN saat create/update biasa. `ValidGoogleDriveLink` tetap jalan
 * kalau field-nya diisi (bukan null) — `nullable` yang menjamin null
 * tetap lolos tanpa kena rule format ini.
 */
class UpdateSekalaBorderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image_link' => ['nullable', 'string', new ValidGoogleDriveLink()],
            'is_published' => ['required', 'boolean'],
        ];
    }
}