<?php

namespace App\Http\Requests\CaseStudy;

use App\Services\CaseStudy\CaseStudyService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Validasi submit Ruang Keputusan — wajib 3 slot terisi opsi BERBEDA +
 * kolom alasan minimal panjang tertentu (CaseStudyService::REASON_MIN_LENGTH).
 * Submit hanya aktif di sisi Flutter jika 3 slot terisi & alasan memenuhi
 * minimal karakter (progress.md) — validasi ini adalah penegakan sisi
 * server-nya, sumber kebenaran akhir.
 */
class StoreCaseStudySubmitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'slot_1_option_id' => ['required', 'integer'],
            'slot_2_option_id' => ['required', 'integer'],
            'slot_3_option_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'min:' . CaseStudyService::REASON_MIN_LENGTH],
        ];
    }

    /**
     * Ketiga slot wajib opsi yang berbeda-beda — duplikasi cek yang juga
     * ada di CaseStudyService::submit() sebagai lapis kedua.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $ids = [
                $this->input('slot_1_option_id'),
                $this->input('slot_2_option_id'),
                $this->input('slot_3_option_id'),
            ];

            if (count(array_filter($ids, fn ($id) => $id !== null)) === 3 && count(array_unique($ids)) !== 3) {
                $validator->errors()->add('slot_1_option_id', 'Ketiga slot prioritas wajib diisi opsi yang berbeda-beda.');
            }
        });
    }

    /**
     * Bentuk array [1 => id, 2 => id, 3 => id] siap dipakai
     * CaseStudyService::submit().
     *
     * @return array{1:int, 2:int, 3:int}
     */
    public function slotOptionIds(): array
    {
        return [
            1 => (int) $this->validated('slot_1_option_id'),
            2 => (int) $this->validated('slot_2_option_id'),
            3 => (int) $this->validated('slot_3_option_id'),
        ];
    }
}