<?php

namespace App\Http\Requests\Admin\Quiz;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuizQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'question' => 'sometimes|nullable|string',

            // R-QUIZ-04/R-QUIZ-10: sama pola dengan 'question' di atas —
            // 'sometimes|nullable' karena PATCH bisa partial update, dan
            // admin boleh mengosongkan sementara saat masih mengetik.
            'explanation_correct' => 'sometimes|nullable|string',
            'explanation_incorrect' => 'sometimes|nullable|string',

            'options' => ['sometimes', 'array', 'min:2'],

            // FIX: 'nullable' (bukan 'required_with'). OptionsEditor::addOption()
            // di WabahWorkspace.jsx menambah opsi baru dengan option_text: ""
            // (diisi belakangan saat admin mengetik), dan ConvertEmptyStringsToNull
            // mengubahnya jadi null sebelum validasi — sama pola dengan bug
            // 'question' di StoreQuizQuestionRequest.
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
                $validator->errors()->add('options', 'Soal pilihan ganda wajib punya tepat satu opsi jawaban benar (R-QUIZ-07).');
            }
        });
    }
}