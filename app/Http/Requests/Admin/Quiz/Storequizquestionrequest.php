<?php

namespace App\Http\Requests\Admin\Quiz;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQuizQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'question' => 'required|string',
            'type' => 'required|in:multiple_choice,essay',
            'correct_answer' => 'nullable|string', // referensi saja untuk essay, bukan grading (R-QUIZ-07)

            // R-QUIZ-07: multiple_choice wajib minimal 2 opsi, tepat satu is_correct.
            'options' => [
                Rule::requiredIf($this->input('type') === 'multiple_choice'),
                'array',
                'min:2',
            ],
            'options.*.option_text' => 'required_with:options|string',
            'options.*.is_correct' => 'boolean',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->input('type') !== 'multiple_choice') {
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