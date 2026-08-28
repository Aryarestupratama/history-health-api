<?php

namespace App\Http\Requests\Admin\Quiz;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateQuizQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'question' => 'sometimes|required|string',
            'type' => 'sometimes|required|in:multiple_choice,essay',
            'correct_answer' => 'nullable|string',

            'options' => ['sometimes', 'array', 'min:2'],
            'options.*.option_text' => 'required_with:options|string',
            'options.*.is_correct' => 'boolean',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $type = $this->input('type', $this->route('question')?->type);

            if ($type !== 'multiple_choice' || ! $this->has('options')) {
                return;
            }

            $options = collect($this->input('options', []));
            $correctCount = $options->filter(fn ($opt) => (bool) ($opt['is_correct'] ?? false))->count();

            if ($correctCount !== 1) {
                $validator->errors()->add('options', 'Soal pilihan ganda wajib punya tepat satu opsi jawaban benar (R-QUIZ-07).');
            }
        });
    }
}