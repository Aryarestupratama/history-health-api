<?php

namespace App\Http\Requests\Admin\EraQuiz;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEraQuizQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'question' => 'sometimes|nullable|string',
            'explanation_correct' => 'sometimes|nullable|string',
            'explanation_incorrect' => 'sometimes|nullable|string',

            'options' => ['sometimes', 'array', 'min:2'],
            'options.*.option_text' => 'nullable|string',
            'options.*.is_correct' => 'boolean',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (! $this->has('options')) {
                return;
            }

            $options = collect($this->input('options', []));
            $correctCount = $options->filter(fn ($opt) => (bool) ($opt['is_correct'] ?? false))->count();

            if ($correctCount !== 1) {
                $validator->errors()->add('options', 'Soal pilihan ganda wajib punya tepat satu opsi jawaban benar (R-ERAQUIZ-07).');
            }
        });
    }
}