<?php

namespace App\Http\Requests\Admin\Quiz;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuizQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            // FIX: 'nullable' (bukan 'required'). WabahWorkspace.jsx
            // (QuizTab::addQuestion()) sengaja membuat soal skeleton dengan
            // question: "" dulu supaya dapat id, baru diisi teks belakangan
            // via updateQuestion() (PATCH). Middleware bawaan Laravel
            // ConvertEmptyStringsToNull mengubah "" jadi null SEBELUM
            // validasi, jadi kalau tetap 'required' -> selalu 422
            // "The question field is required." setiap kali admin klik
            // "+ Soal" (pola identik dengan bug 'content' di
            // StoreContentBlockRequest).
            'question' => 'nullable|string',

            // R-QUIZ-04/R-QUIZ-10 (revisi terbaru — feedback dipecah 2 kolom):
            // 'nullable' (bukan 'required'), alasan SAMA seperti 'question' di
            // atas — QuizTab::addQuestion() bikin skeleton soal dulu (semua
            // field teks "") supaya dapat id, baru diisi belakangan via
            // updateQuestion() (PATCH). Enforcement "wajib diisi" (R-QUIZ-10)
            // TIDAK dilakukan di sini, melainkan sebagai syarat publish kuis
            // (lihat Quiz::canPublish(), perlu diperluas terpisah dari file
            // ini) — konsisten dengan pola R-QUIZ-05 (years.summary juga
            // dicek saat publish, bukan saat soal dibuat).
            'explanation_correct' => 'nullable|string',
            'explanation_incorrect' => 'nullable|string',

            // R-QUIZ-07: kuis murni pilihan ganda — semua soal wajib minimal
            // 2 opsi, tepat satu is_correct. Tidak ada lagi percabangan tipe.
            'options' => ['required', 'array', 'min:2'],

            // FIX: 'nullable' (bukan 'required_with'). Sama alasan seperti
            // 'question' di atas — addQuestion() mengirim option_text: ""
            // untuk kedua opsi awal (diisi belakangan via OptionsEditor).
            'options.*.option_text' => 'nullable|string',
            'options.*.is_correct' => 'boolean',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $options = collect($this->input('options', []));
            $correctCount = $options->filter(fn ($opt) => (bool) ($opt['is_correct'] ?? false))->count();

            if ($correctCount !== 1) {
                $validator->errors()->add('options', 'Soal pilihan ganda wajib punya tepat satu opsi jawaban benar (R-QUIZ-07).');
            }
        });
    }
}