<?php

namespace App\Http\Requests\EraQuiz;

use App\Models\EraQuiz;
use App\Models\QuizQuestionOption;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;

/**
 * REVISI BESAR: soal sumatif era sekarang ditarik dari bank FORMATIF
 * (quiz_questions/quiz_question_options) milik tiap year dalam era ini —
 * bank soal era sendiri (era_quiz_questions) dihapus total. Validasi di
 * sini disesuaikan: exists ke quiz_question_options, dan pengecekan
 * kepemilikan soal jadi "question_id memang milik salah satu quiz year
 * dalam era ini" (bukan lagi ke era_quiz_id).
 *
 * Format body SAMA: { "answers": { "<question_id>": <option_id>, ... } },
 * WAJIB tepat EraQuiz::ATTEMPT_QUESTION_COUNT (20) — jumlah ini didapat
 * dari distribusi proporsional per year (EraQuiz::questionQuotaPerYear()),
 * bukan seleksi bebas dari pool besar lagi.
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
            'answers' => ['required', 'array', 'size:'.EraQuiz::ATTEMPT_QUESTION_COUNT],
            'answers.*' => ['required', 'integer', 'exists:quiz_question_options,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'answers.required' => 'Jawaban wajib diisi.',
            'answers.array' => 'Format jawaban tidak valid.',
            'answers.size' => 'Jawaban harus mencakup tepat '.EraQuiz::ATTEMPT_QUESTION_COUNT.' soal yang ditampilkan.',
            'answers.*.required' => 'Setiap soal wajib dijawab sebelum submit.',
            'answers.*.integer' => 'Setiap jawaban harus berupa id opsi yang valid.',
            'answers.*.exists' => 'Opsi jawaban tidak ditemukan.',
        ];
    }

    /**
     * Pastikan: (1) setiap question_id yang dikirim memang milik quiz
     * FORMATIF salah satu year dalam era ini (bukan year dari era lain),
     * dan (2) tiap option_id memang milik question_id tsb.
     */
    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            $answers = $this->input('answers', []);
            $era = $this->route('era');

            if (! $era) {
                return;
            }

            // question_id valid = quiz_questions milik quiz milik year yang
            // era_id-nya sama dengan era ini.
            $validQuestionIds = \App\Models\QuizQuestion::whereHas(
                'quiz.year',
                fn ($q) => $q->where('era_id', $era->id)
            )->pluck('id');

            foreach ($answers as $questionId => $optionId) {
                if (! $validQuestionIds->contains((int) $questionId)) {
                    $validator->errors()->add('answers', "Soal dengan id {$questionId} bukan bagian dari era ini.");

                    continue;
                }

                $belongsToQuestion = QuizQuestionOption::where('id', $optionId)
                    ->where('quiz_question_id', $questionId)
                    ->exists();

                if (! $belongsToQuestion) {
                    $validator->errors()->add('answers', "Opsi jawaban tidak sesuai dengan soal id {$questionId}.");
                }
            }
        });
    }
}