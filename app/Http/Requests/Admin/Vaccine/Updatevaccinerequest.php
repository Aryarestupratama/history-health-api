<?php

namespace App\Http\Requests\Admin\Vaccine;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;

class UpdateVaccineRequest extends FormRequest
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
            'manufacturer' => 'nullable|string|max:255',
            'disease_target' => 'sometimes|required|string|max:255',
            'year_introduced' => 'nullable|integer|min:1000|max:'.(date('Y') + 1),
            'description' => 'sometimes|required|string',
        ];
    }
}