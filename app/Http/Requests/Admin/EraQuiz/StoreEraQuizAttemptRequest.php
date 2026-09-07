<?php

namespace App\Http\Requests\EraQuiz;

use App\Models\EraQuizQuestionOption;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Beda mendasar dari StoreQuizAttemptRequest (year): di kuis year, submit
 * boleh partial (dipakai flow lama) karena sekarang jawaban year disimpan
 * progresif per-soal lewat StoreQuizAnswerRequest. Kuis sumatif era TIDAK
 * progresif — 1 soal 1 halaman tapi submit baru terjadi di soal terakhir,
 * jadi request ini WAJIB berisi jawaban untuk SEMUA soal yang ada di
 * eraQuiz (R-ERAQUIZ-04), tidak boleh ada yang terlewat.
 *
 * Format body SAMA dengan pola quiz year:
 * { "answers": { "<question_id>": <option_id>, ... } }
 */
class StoreEraQuizAttemptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gate akses (isUnlocked, verified) dicek di controller
    }

    public function rules(): array
    {
        return [
            'answers' => ['required', 'array'],
            'answers.*' => ['required', 'integer', 'exists:era_quiz_question_options,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'answers.required' => 'Jawaban wajib diisi.',
            'answers.array' => 'Format jawaban tidak valid.',
            'answers.*.required' => 'Setiap soal wajib dijawab sebelum submit.',
            'answers.*.integer' => 'Setiap jawaban harus berupa id opsi yang valid.',
            'answers.*.exists' => 'Opsi jawaban tidak ditemukan.',
        ];
    }

    /**
     * Pastikan: (1) jawaban mencakup SELURUH soal milik eraQuiz — tidak
     * boleh ada yang belum terjawab (beda dari kuis year yang boleh
     * partial), dan (2) tiap option_id memang milik question_id tsb —
     * sama pola pengecekan relasi dengan StoreQuizAttemptRequest.
     */
    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            $answers = $this->input('answers', []);
            $eraQuiz = $this->route('era')?->eraQuiz;

            if (! $eraQuiz) {
                return;
            }

            $questionIds = $eraQuiz->questions()->pluck('id');

            $unanswered = $questionIds->diff(
                collect(array_keys($answers))->map(fn ($id) => (int) $id)
            );

            if ($unanswered->isNotEmpty()) {
                $validator->errors()->add('answers', 'Semua soal wajib dijawab sebelum submit kuis sumatif.');
            }

            foreach ($answers as $questionId => $optionId) {
                if (! $questionIds->contains((int) $questionId)) {
                    $validator->errors()->add('answers', "Soal dengan id {$questionId} bukan bagian dari kuis sumatif ini.");

                    continue;
                }

                $belongsToQuestion = EraQuizQuestionOption::where('id', $optionId)
                    ->where('era_quiz_question_id', $questionId)
                    ->exists();

                if (! $belongsToQuestion) {
                    $validator->errors()->add('answers', "Opsi jawaban tidak sesuai dengan soal id {$questionId}.");
                }
            }
        });
    }
}