<?php

namespace App\Http\Requests\YearSummary;

use App\Models\YearSummaryPointOption;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi 1 jawaban poin Rangkuman Interaktif — mirror
 * StoreQuizAnswerRequest (kuis year), dipakai
 * UserYearSummaryController::checkAnswer(). Feedback hasilnya TIDAK
 * disimpan, murni dihitung on-the-fly (lihat YearSummaryService::checkAnswer()).
 */
class StoreYearSummaryAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gate akses (section completed, summary published) dicek di controller
    }

    public function rules(): array
    {
        return [
            'option_id' => ['required', 'integer', 'exists:year_summary_point_options,id'],
        ];
    }

    /**
     * Pastikan option_id yang dikirim memang milik poin ({point} di route)
     * — sama pola dengan StoreQuizAnswerRequest.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $optionId = $this->input('option_id');
            $point = $this->route('point');

            if (! $optionId || ! $point) {
                return;
            }

            $belongsToPoint = YearSummaryPointOption::where('id', $optionId)
                ->where('year_summary_point_id', $point->id)
                ->exists();

            if (! $belongsToPoint) {
                $validator->errors()->add('option_id', 'Opsi tidak sesuai dengan poin ini.');
            }
        });
    }
}