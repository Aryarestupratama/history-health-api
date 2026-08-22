<?php

namespace App\Http\Requests\Admin\ContentBlock;

use App\Rules\Content\ValidGoogleDriveLink;
use App\Rules\Content\ValidYoutubeLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContentBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['text', 'image', 'video', 'pdf', 'summary'])],
            'content' => ['required', 'string', $this->contentRule()],
        ];
    }

    /**
     * Rule dinamis tergantung 'type' yang dikirim.
     */
    protected function contentRule()
    {
        return function ($attribute, $value, $fail) {
            $type = $this->input('type');

            if (in_array($type, ['image', 'pdf'])) {
                (new ValidGoogleDriveLink)->validate($attribute, $value, $fail);
            } elseif ($type === 'video') {
                (new ValidYoutubeLink)->validate($attribute, $value, $fail);
            }
            // type text/summary -> tidak perlu validasi link, bebas teks/HTML
        };
    }
}