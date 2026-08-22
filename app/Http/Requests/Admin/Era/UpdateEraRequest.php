<?php

namespace App\Http\Requests\Admin\Era;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        $era = $this->route('era');

        return [
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|unique:eras,slug,' . $era->id,
            'description' => 'nullable|string',
            'order' => 'sometimes|required|integer|min:1',
        ];
    }
}