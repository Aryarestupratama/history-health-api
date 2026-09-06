<?php

namespace App\Http\Requests\Quiz;

use App\Models\QuizQuestionOption;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi 1 jawaban untuk 1 soal (BEDA dari StoreQuizAttemptRequest lama
 * yang terima semua jawaban sekaligus). Dipakai UserQuizController::answerQuestion().
 */
class StoreQuizAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gate akses (section completed, quiz published) dicek di controller
    }

    public function rules(): array
    {
        return [
            'option_id' => ['required', 'integer', 'exists:quiz_question_options,id'],
        ];
    }

    /**
     * Pastikan option_id yang dikirim memang milik soal ({question} di
     * route) — bukan cuma valid secara global, sama pola dengan
     * pengecekan mismatch option/question di submitAttempt() lama.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $optionId = $this->input('option_id');
            $question = $this->route('question');

            if (! $optionId || ! $question) {
                return;
            }

            $belongsToQuestion = QuizQuestionOption::where('id', $optionId)
                ->where('quiz_question_id', $question->id)
                ->exists();

            if (! $belongsToQuestion) {
                $validator->errors()->add('option_id', 'Opsi tidak sesuai dengan soal ini.');
            }
        });
    }
}