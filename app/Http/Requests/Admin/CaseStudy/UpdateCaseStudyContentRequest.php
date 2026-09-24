<?php

namespace App\Http\Requests\Admin\CaseStudy;

use App\Rules\Content\ValidGoogleDriveLink;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi konten teks studi kasus (Layar 2 Briefing, Layar 3 deskripsi
 * alasan, feedback tingkat kasus, Layar 4 Badge). SEMUA field nullable di
 * level request — sama filosofi dengan year_summary_points yang boleh
 * kosong saat skeleton baru dibuat, wajib terisi baru dicek sebagai syarat
 * publish (CaseStudy::canPublish()), bukan validasi keras di sini.
 */
class UpdateCaseStudyContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'challenge_text' => ['nullable', 'string'],
            'reason_description' => ['nullable', 'string'],
            'feedback_correct' => ['nullable', 'string'],
            'feedback_incorrect' => ['nullable', 'string'],
            'badge_name' => ['nullable', 'string', 'max:255'],
            'badge_description' => ['nullable', 'string'], // opsional, tidak jadi syarat publish
            'badge_image_link' => ['nullable', 'string', new ValidGoogleDriveLink()],
        ];
    }
}