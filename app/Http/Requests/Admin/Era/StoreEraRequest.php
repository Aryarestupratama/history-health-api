<?php

namespace App\Http\Requests\Admin\Era;

use Illuminate\Foundation\Http\FormRequest;

class StoreEraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:eras,slug',
            'description' => 'nullable|string',
            'order' => 'required|integer|min:1',
        ];
    }
}