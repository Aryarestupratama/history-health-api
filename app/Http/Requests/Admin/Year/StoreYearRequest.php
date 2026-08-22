<?php

namespace App\Http\Requests\Admin\Year;

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
        ];
    }
}