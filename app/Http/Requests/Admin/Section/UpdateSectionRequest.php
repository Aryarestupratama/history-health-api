<?php

namespace App\Http\Requests\Admin\Section;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'year_id' => 'sometimes|required|exists:years,id',
            'title' => 'sometimes|required|string|max:255',
            'order' => 'sometimes|required|integer|min:1',
            'is_published' => 'sometimes|boolean',

            // (Baru) Header gambar section — OPSIONAL, boleh dikosongkan lagi
            // lewat update (mis. admin menghapus header yang sudah diisi).
            'header_image' => ['sometimes', 'nullable', 'string', new ValidGoogleDriveLink],
        ];
    }
}