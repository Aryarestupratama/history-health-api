<?php

namespace App\Http\Requests\Admin\EraQuiz;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Sama pola persis dengan StoreQuizQuestionRequest (year), TANPA batas
 * jumlah soal (R-ERAQUIZ-06 — beda dari R-QUIZ-06 yang membatasi 5).
 */
class StoreEraQuizQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            // 'nullable' (bukan 'required') — skeleton soal kosong dibuat
            // dulu dari CMS, diisi belakangan via updateQuestion() (PATCH).
            // Sama alasan dengan StoreQuizQuestionRequest.
            'question' => 'nullable|string',

            // R-ERAQUIZ-10: wajib diisi sebagai syarat PUBLISH
            // (EraQuiz::canPublish()), bukan validasi keras di sini.
            'explanation_correct' => 'nullable|string',
            'explanation_incorrect' => 'nullable|string',

            // R-ERAQUIZ-07: murni pilihan ganda, wajib minimal 2 opsi.
            'options' => ['required', 'array', 'min:2'],
            'options.*.option_text' => 'nullable|string',
            'options.*.is_correct' => 'boolean',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $options = collect($this->input('options', []));
            $correctCount = $options->filter(fn ($opt) => (bool) ($opt['is_correct'] ?? false))->count();

            if ($correctCount !== 1) {
                $validator->errors()->add('options', 'Soal pilihan ganda wajib punya tepat satu opsi jawaban benar (R-ERAQUIZ-07).');
            }
        });
    }
}