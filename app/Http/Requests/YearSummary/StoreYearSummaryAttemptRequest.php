<?php

namespace App\Http\Requests\YearSummary;

use App\Models\YearSummaryPointOption;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi submit akhir Rangkuman Interaktif (dipanggil setelah poin ke-7
 * dijawab, SUM-05/R-SUM-11) — mirror StoreEraQuizAttemptRequest (wajib
 * lengkap semua item, bukan partial seperti kuis year).
 *
 * Format body:
 * { "answers": [ { "point_id": <int>, "option_id": <int> }, ... ] }  // tepat 7 item
 *
 * Dipakai untuk pengerjaan pertama MAUPUN "Kerjakan Ulang" (retake) — di
 * kedua kasus body-nya sama, service yang menentukan overwrite lewat
 * UserYearSummaryCompletion::recordCompletion() (R-SUM-11).
 */
class StoreYearSummaryAttemptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gate akses (section completed, summary published) dicek di controller
    }

    public function rules(): array
    {
        return [
            'answers' => ['required', 'array', 'size:7'],
            'answers.*.point_id' => ['required', 'integer', 'exists:year_summary_points,id'],
            'answers.*.option_id' => ['required', 'integer', 'exists:year_summary_point_options,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'answers.required' => 'Jawaban wajib diisi.',
            'answers.size' => 'Rangkuman Interaktif wajib dijawab lengkap untuk seluruh 7 poin.',
            'answers.*.point_id.required' => 'Setiap jawaban wajib menyertakan poin yang dijawab.',
            'answers.*.option_id.required' => 'Setiap poin wajib dijawab sebelum submit.',
        ];
    }

    /**
     * Pastikan: (1) 7 point_id yang dikirim unik & persis sama dengan 7
     * poin milik year_summary di route (tidak boleh ada yang terlewat/
     * duplikat/dari summary lain), dan (2) tiap option_id memang milik
     * point_id yang bersangkutan — sama pola pengecekan relasi dengan
     * StoreEraQuizAttemptRequest.
     */
    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            $answers = $this->input('answers', []);
            $yearSummary = $this->route('year')?->summary;

            if (! $yearSummary) {
                return;
            }

            $pointIds = $yearSummary->points()->pluck('id');
            $answeredPointIds = collect($answers)->pluck('point_id')->map(fn ($id) => (int) $id);

            if ($answeredPointIds->unique()->count() !== $answeredPointIds->count()) {
                $validator->errors()->add('answers', 'Tidak boleh ada poin yang dijawab lebih dari sekali.');
            }

            if ($pointIds->diff($answeredPointIds)->isNotEmpty() || $answeredPointIds->diff($pointIds)->isNotEmpty()) {
                $validator->errors()->add('answers', 'Jawaban harus mencakup persis 7 poin milik Rangkuman Interaktif ini, tidak lebih tidak kurang.');

                return;
            }

            foreach ($answers as $answer) {
                $belongsToPoint = YearSummaryPointOption::where('id', $answer['option_id'])
                    ->where('year_summary_point_id', $answer['point_id'])
                    ->exists();

                if (! $belongsToPoint) {
                    $validator->errors()->add('answers', "Opsi jawaban tidak sesuai dengan poin id {$answer['point_id']}.");
                }
            }
        });
    }
}