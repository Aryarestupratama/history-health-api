<?php

namespace App\Http\Requests\Admin\Section;

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
            'quiz_link' => 'nullable|url',
            'is_published' => 'sometimes|boolean',
        ];
    }
}