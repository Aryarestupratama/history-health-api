<?php

namespace App\Http\Requests\Admin\ContentBlock;

use Illuminate\Foundation\Http\FormRequest;

class ReorderContentBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'block_ids' => 'required|array|min:1',
            'block_ids.*' => 'required|integer|exists:content_blocks,id',
        ];
    }
}