<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateFrameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'frame_equipped' => ['required', 'boolean'],
        ];
    }

    /**
     * Guard "tidak boleh equip border yang belum unlocked" ditaruh di sini
     * (bukan di FrameController/service) — sama alasan validasi lain di
     * app ini yang menolak sedini mungkin di layer request, sebelum
     * menyentuh model. Melepas (frame_equipped=false) selalu boleh, apa
     * pun status unlock-nya.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $wantsToEquip = $this->boolean('frame_equipped');

            if ($wantsToEquip && ! $this->user()->hasFrameUnlocked()) {
                $validator->errors()->add(
                    'frame_equipped',
                    'Border SEKALA belum terbuka — kumpulkan semua badge terlebih dahulu.'
                );
            }
        });
    }
}