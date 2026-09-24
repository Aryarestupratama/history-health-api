<?php

namespace App\Http\Requests\Admin\CaseStudy;

use App\Models\CaseStudy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Validasi update 5 opsi studi kasus sekaligus (dropdown admin "Prioritas
 * 1/2/3/Pengecoh"). BEDA dari kuis/rangkuman — opsi TIDAK bisa
 * ditambah/dikurangi (selalu tepat 5, dibuat sekali via
 * CaseStudyService::ensureSkeleton()), request ini hanya UPDATE in-place
 * 5 row yang sudah ada (wajib sertakan `id` tiap opsi).
 */
class UpdateCaseStudyOptionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'options' => ['required', 'array', 'size:' . CaseStudy::OPTION_COUNT],
            'options.*.id' => ['required', 'integer', 'exists:case_study_options,id'],
            'options.*.title' => ['required', 'string', 'max:255'],
            'options.*.description' => ['required', 'string'],
            'options.*.correct_rank' => ['nullable', 'integer', 'between:1,3'],
        ];
    }

    /**
     * Lapis validasi tambahan — tepat 3 opsi dengan correct_rank
     * 1/2/3 (masing-masing sekali), 2 sisanya null. Duplikasi cek yang
     * juga ada di CaseStudyService::updateOptions() (defensif, sama pola
     * dengan UpdateYearSummaryPointRequest), supaya pesan error sudah
     * ramah di level request sebelum sampai ke service.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $options = $this->input('options', []);

            $ranks = collect($options)
                ->pluck('correct_rank')
                ->filter(fn ($rank) => $rank !== null)
                ->values();

            if ($ranks->count() !== CaseStudy::RANK_SLOTS || $ranks->sort()->values()->all() !== [1, 2, 3]) {
                $validator->errors()->add(
                    'options',
                    'Wajib tepat 3 opsi dengan prioritas 1, 2, dan 3 (masing-masing satu), 2 sisanya pengecoh.'
                );
            }
        });
    }
}