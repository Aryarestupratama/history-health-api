<?php

namespace App\Http\Requests\Admin\WabahIntro;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWabahIntroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            // Nullable — admin boleh simpan draft dulu tanpa mengisi
            // teksnya (sama pola dengan StoreContentBlockRequest: content
            // skeleton kosong dulu, diisi belakangan).
            'content' => ['nullable', 'string'],

            // 'sometimes' — request update content saja (tanpa
            // menyertakan is_published) tidak boleh diam-diam mereset
            // status publish jadi false.
            'is_published' => ['sometimes', 'boolean'],
        ];
    }
}