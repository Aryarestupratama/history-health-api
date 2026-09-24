<?php

namespace App\Http\Requests\Admin\Vaccine;

use Illuminate\Foundation\Http\FormRequest;

class AssignVaccineYearsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // 'present' (bukan 'required') — array kosong valid & disengaja,
            // artinya admin melepas semua relasi year dari vaksin ini lewat
            // sync(). Sama pola dengan AssignVaccinesRequest di sisi Year.
            'year_ids' => ['present', 'array'],
            'year_ids.*' => ['integer', 'distinct', 'exists:years,id'],
        ];
    }
}