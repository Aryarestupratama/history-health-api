<?php

namespace App\Http\Requests\Admin\YearSummary;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi update 1 poin Rangkuman Interaktif — beda dari
 * StoreQuizQuestionRequest (soal kuis boleh nullable dulu buat skeleton),
 * di sini SELALU replace penuh 3 opsi sekaligus (R-SUM-02: tepat 3 opsi,
 * tepat 1 is_correct=true). Dipakai UpdateYearSummaryPointRequest oleh
 * Admin\YearSummary\YearSummaryController::updatePoint().
 */
class UpdateYearSummaryPointRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gate role admin sudah di middleware route (grup 'admin')
    }

    public function rules(): array
    {
        return [
            'options' => ['required', 'array', 'size:3'],
            'options.*.option_text' => ['required', 'string'],
            'options.*.is_correct' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'options.required' => 'Opsi wajib diisi.',
            'options.size' => 'Setiap poin wajib tepat 3 opsi (1 kalimat benar + 2 pengecoh).',
            'options.*.option_text.required' => 'Teks kalimat wajib diisi untuk setiap opsi.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $options = $this->input('options', []);
            $correctCount = collect($options)->where('is_correct', true)->count();

            if ($correctCount !== 1) {
                $validator->errors()->add('options', 'Wajib tepat satu opsi yang ditandai sebagai kalimat benar (bukan pengecoh).');
            }
        });
    }
}