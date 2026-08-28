<?php

namespace App\Http\Requests\Admin\Figure;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;

class UpdateFigureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'photo' => ['nullable', 'string', new ValidGoogleDriveLink],
            'birth_date' => 'nullable|date',
            'death_date' => 'nullable|date|after_or_equal:birth_date',
            'family' => 'nullable|string',
            'role_description' => 'sometimes|required|string',
        ];
    }
}