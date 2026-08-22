<?php

namespace App\Http\Requests\Admin\Section;

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
            'title' => 'required|string|max:255',
            'quiz_link' => 'nullable|url',
            // is_published TIDAK divalidasi di sini — section baru selalu draft dulu (R-ADMIN-03)
        ];
    }
}