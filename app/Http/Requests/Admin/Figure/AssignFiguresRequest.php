<?php

namespace App\Http\Requests\Admin\Figure;

use Illuminate\Foundation\Http\FormRequest;

class AssignFiguresRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'figure_ids' => 'required|array',
            'figure_ids.*' => 'required|integer|exists:figures,id',
        ];
    }
}