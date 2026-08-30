<?php

namespace App\Http\Requests\Admin\Year;

use Illuminate\Foundation\Http\FormRequest;

class UpdateYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'era_id' => 'sometimes|required|exists:eras,id',
            'year' => 'sometimes|required|integer',
            'title' => 'sometimes|required|string|max:255',
            'summary' => 'sometimes|nullable|string',
        ];
    }
}