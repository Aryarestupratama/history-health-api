<?php

namespace App\Http\Requests\Quiz;

use App\Models\QuizQuestionOption;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Validator;

class StoreQuizAttemptRequest extends FormRequest
{
    /**
     * R-QUIZ-09 (guest tidak bisa akses sama sekali) & verifikasi email
     * sudah ditangani middleware route (auth:sanctum + verified), jadi di
     * sini cukup true — otorisasi "quiz milik year mana" bukan urusan
     * request, tetap dicek di controller (route model binding {year}).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Format body: { "answers": { "<question_id>": <quiz_question_option_id>, ... } }
     * Object map (question_id => option_id), BUKAN array of objects.
     */
    public function rules(): array
    {
        return [
            'answers' => ['nullable', 'array'],
            // Tiap value harus id opsi jawaban yang valid di tabel.
            // Relasi "opsi ini benar-benar milik soal ini" tidak bisa
            // divalidasi lewat rule string biasa (butuh key => value pair),
            // jadi dicek manual di withValidator() di bawah.
            'answers.*' => ['nullable', 'integer', 'exists:quiz_question_options,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'answers.array' => 'Format jawaban tidak valid.',
            'answers.*.integer' => 'Setiap jawaban harus berupa id opsi yang valid.',
            'answers.*.exists' => 'Opsi jawaban tidak ditemukan.',
        ];
    }

    /**
     * R-QUIZ-04: pastikan tiap key (question_id) memang soal milik quiz
     * pada year ini, DAN tiap value (option_id) memang milik question_id
     * tsb — rule 'exists:quiz_question_options,id' saja tidak menjamin
     * relasi ini, sehingga option_id dari soal/quiz lain yang kebetulan
     * valid ID-nya bisa lolos dan bikin feedback salah tampil.
     *
     * Route model binding {year} belum otomatis tersedia di dalam
     * FormRequest constructor, tapi $this->route('year') sudah bisa
     * dipakai di withValidator() karena route sudah di-resolve saat itu.
     */
    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            $answers = $this->input('answers', []);

            if (empty($answers)) {
                return;
            }

            $year = $this->route('year');
            $quiz = $year?->quiz;

            if (! $quiz) {
                // Kalau quiz-nya sendiri tidak ada, biarkan controller yang
                // menangani (404) — di sini cukup skip validasi relasi.
                return;
            }

            $quizQuestionIds = $quiz->questions()->pluck('id');

            foreach ($answers as $questionId => $optionId) {
                if ($optionId === null) {
                    continue;
                }

                if (! $quizQuestionIds->contains((int) $questionId)) {
                    $validator->errors()->add(
                        'answers',
                        "Soal dengan id {$questionId} bukan bagian dari kuis ini."
                    );

                    continue;
                }

                $belongsToQuestion = QuizQuestionOption::where('id', $optionId)
                    ->where('quiz_question_id', $questionId)
                    ->exists();

                if (! $belongsToQuestion) {
                    $validator->errors()->add(
                        'answers',
                        "Opsi jawaban tidak sesuai dengan soal id {$questionId}."
                    );
                }
            }
        });
    }
}