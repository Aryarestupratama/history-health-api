<?php

namespace App\Http\Controllers\Admin\EraQuiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\EraQuiz\StoreEraQuizQuestionRequest;
use App\Http\Requests\Admin\EraQuiz\UpdateEraQuizQuestionRequest;
use App\Models\Era;
use App\Models\EraQuiz;
use App\Models\EraQuizQuestion;
use Illuminate\Http\Request;

class EraQuizController extends Controller
{
    /**
     * GET /admin/eras/{era}/quiz — ambil (atau buat draft baru) kuis
     * sumatif milik era. 1 kuis per era (unique era_id di Schema.md),
     * jadi selalu firstOrCreate — sama pola dengan QuizController::show().
     */
    public function show(Era $era)
    {
        $eraQuiz = EraQuiz::firstOrCreate(
            ['era_id' => $era->id],
            ['is_published' => false]
        );

        return $eraQuiz->load('questions.options');
    }

    /**
     * PATCH /admin/era-quizzes/{eraQuiz}/publish — toggle publish.
     * R-ERAQUIZ-10: minimal 1 soal + setiap soal punya explanation_correct
     * & explanation_incorrect terisi. TIDAK ada syarat "summary terisi"
     * (beda dari QuizController::publish() — era tidak punya kolom summary).
     */
    public function publish(Request $request, EraQuiz $eraQuiz)
    {
        $wantsPublish = (bool) $request->boolean('is_published');

        if ($wantsPublish && ! $eraQuiz->canPublish()) {
            return response()->json([
                'message' => 'Kuis sumatif belum bisa dipublish. Pastikan minimal 1 soal sudah dibuat dan setiap soal sudah punya penjelasan untuk jawaban benar maupun salah (explanation_correct & explanation_incorrect).',
            ], 422);
        }

        $eraQuiz->update(['is_published' => $wantsPublish]);

        return $eraQuiz;
    }

    /**
     * POST /admin/era-quizzes/{eraQuiz}/questions
     * R-ERAQUIZ-06: TIDAK ada batas maksimal jumlah soal (beda dari
     * QuizController::storeQuestion() yang membatasi 5 soal — R-QUIZ-06).
     * R-ERAQUIZ-07: wajib >=2 opsi dengan tepat satu is_correct.
     */
    public function storeQuestion(StoreEraQuizQuestionRequest $request, EraQuiz $eraQuiz)
    {
        $data = $request->validated();
        $options = $data['options'] ?? [];
        unset($data['options']);

        // FIX: sama alasan dengan QuizController::storeQuestion() — admin
        // CMS mengirim skeleton soal kosong ("") dulu untuk dapat id, diisi
        // belakangan via updateQuestion(). Middleware
        // ConvertEmptyStringsToNull mengubah "" jadi null sebelum validasi,
        // sementara kolom-kolom ini NOT NULL di DB.
        $data['question'] = $data['question'] ?? '';
        $data['explanation_correct'] = $data['explanation_correct'] ?? '';
        $data['explanation_incorrect'] = $data['explanation_incorrect'] ?? '';

        $data['order'] = $eraQuiz->questions()->max('order') + 1;

        $question = $eraQuiz->questions()->create($data);

        foreach ($options as $index => $option) {
            $question->options()->create([
                'option_text' => $option['option_text'] ?? '',
                'is_correct' => $option['is_correct'] ?? false,
                'order' => $index + 1,
            ]);
        }

        return response()->json($question->load('options'), 201);
    }

    public function updateQuestion(UpdateEraQuizQuestionRequest $request, EraQuizQuestion $question)
    {
        $data = $request->validated();
        $options = $data['options'] ?? null;
        unset($data['options']);

        if (array_key_exists('question', $data)) {
            $data['question'] = $data['question'] ?? '';
        }

        if (array_key_exists('explanation_correct', $data)) {
            $data['explanation_correct'] = $data['explanation_correct'] ?? '';
        }

        if (array_key_exists('explanation_incorrect', $data)) {
            $data['explanation_incorrect'] = $data['explanation_incorrect'] ?? '';
        }

        $question->update($data);

        // R-ERAQUIZ-07: opsi di-replace penuh saat diedit — sama pola
        // dengan QuizController::updateQuestion().
        if ($options !== null) {
            $question->options()->delete();

            foreach ($options as $index => $option) {
                $question->options()->create([
                    'option_text' => $option['option_text'] ?? '',
                    'is_correct' => $option['is_correct'] ?? false,
                    'order' => $index + 1,
                ]);
            }
        }

        return $question->load('options');
    }

    public function destroyQuestion(EraQuizQuestion $question)
    {
        $question->delete();

        return response()->json(null, 204);
    }
}