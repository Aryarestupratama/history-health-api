<?php

namespace App\Http\Requests\Admin\ContentBlock;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContentBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            // Tipe 'summary' dihapus dari daftar valid — rangkuman sudah naik
            // level ke years.summary_image (Schema.md revisi major, R-YEAR-01).
            'type' => ['sometimes', 'required', Rule::in(['text', 'image', 'video', 'pdf'])],

            // Tetap 'required' di update: berbeda dari store, PATCH di sini
            // dipakai admin untuk benar-benar mengisi konten (WabahWorkspace.jsx
            // updateBlock()), jadi string kosong memang seharusnya ditolak.
            'content' => ['sometimes', 'required', 'string', $this->contentRule()],

            // (Baru) Caption — OPSIONAL, boleh dikosongkan lewat update
            // (mis. admin menghapus caption yang sudah pernah diisi).
            'caption' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    protected function contentRule()
    {
        return function ($attribute, $value, $fail) {
            // FIX: nama route parameter di routes/api.php adalah {contentBlock}
            // (camelCase), bukan {content_block}. Sebelumnya
            // $this->route('content_block') selalu null, sehingga saat
            // WabahWorkspace.jsx mem-PATCH content tanpa ikut kirim 'type'
            // (lihat updateBlock(), hanya kirim { content }), $type jatuh ke
            // null dan validasi link Drive/YouTube ter-skip diam-diam —
            // R-CMS-05/R-CMS-06 jadi tidak berlaku saat update block
            // image/video/pdf.
            $type = $this->input('type', $this->route('contentBlock')?->type);

            // (Revisi) 'video' digabung ke validasi Google Drive — lihat
            // catatan yang sama di StoreContentBlockRequest.
            if (in_array($type, ['image', 'video', 'pdf'])) {
                (new ValidGoogleDriveLink)->validate($attribute, $value, $fail);
            }
        };
    }
}