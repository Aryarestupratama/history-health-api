<?php

namespace App\Http\Requests\Admin\Year;

use Illuminate\Foundation\Http\FormRequest;

class AssignVaccinesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'vaccine_ids' => 'present|array',
            'vaccine_ids.*' => 'exists:vaccines,id',
        ];
    }
}