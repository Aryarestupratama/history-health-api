<?php

namespace App\Http\Controllers\Admin\Quiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Quiz\StoreQuizQuestionRequest;
use App\Http\Requests\Admin\Quiz\UpdateQuizQuestionRequest;
use App\Models\Quiz;
use App\Models\QuizQuestion;
use App\Models\Year;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    /**
     * GET /admin/years/{year}/quiz — ambil (atau buat draft baru) kuis milik year.
     * 1 kuis per year (unique year_id di Schema.md), jadi selalu firstOrCreate.
     */
    public function show(Year $year)
    {
        $quiz = Quiz::firstOrCreate(
            ['year_id' => $year->id],
            ['is_published' => false]
        );

        return $quiz->load('questions.options');
    }

    /**
     * PATCH /admin/quizzes/{quiz}/publish — toggle publish.
     * R-QUIZ-05: minimal 1 soal + years.summary terisi.
     */
    public function publish(Request $request, Quiz $quiz)
    {
        $wantsPublish = (bool) $request->boolean('is_published');

        if ($wantsPublish && ! $quiz->canPublish()) {
            return response()->json([
                'message' => 'Kuis belum bisa dipublish. Pastikan minimal 1 soal sudah dibuat dan rangkuman tahun (years.summary) sudah terisi.',
            ], 422);
        }

        $quiz->update(['is_published' => $wantsPublish]);

        return $quiz;
    }

    /**
     * POST /admin/quizzes/{quiz}/questions
     * R-QUIZ-06: maksimal 5 soal, divalidasi di sini (bukan constraint DB).
     * R-QUIZ-07: multiple_choice wajib >=2 opsi dengan tepat satu is_correct.
     */
    public function storeQuestion(StoreQuizQuestionRequest $request, Quiz $quiz)
    {
        if ($quiz->questions()->count() >= 5) {
            return response()->json([
                'message' => 'Maksimal 5 soal per kuis (R-QUIZ-06).',
            ], 422);
        }

        $data = $request->validated();
        $options = $data['options'] ?? [];
        unset($data['options']);

        $data['order'] = $quiz->questions()->max('order') + 1;

        $question = $quiz->questions()->create($data);

        if ($data['type'] === 'multiple_choice') {
            foreach ($options as $index => $option) {
                $question->options()->create([
                    'option_text' => $option['option_text'],
                    'is_correct' => $option['is_correct'] ?? false,
                    'order' => $index + 1,
                ]);
            }
        }

        return response()->json($question->load('options'), 201);
    }

    public function updateQuestion(UpdateQuizQuestionRequest $request, QuizQuestion $question)
    {
        $data = $request->validated();
        $options = $data['options'] ?? null;
        unset($data['options']);

        $question->update($data);

        // R-QUIZ-07: opsi jawaban di-replace penuh saat diedit, lebih sederhana
        // daripada diff per-opsi dan cukup untuk kebutuhan admin CMS ini.
        // Jika tipe soal berubah jadi 'essay', opsi lama (peninggalan saat
        // masih multiple_choice) juga wajib dibersihkan — bukan cuma saat
        // options baru dikirim, supaya tidak ada opsi nyangkut di DB untuk
        // soal yang sekarang bertipe essay.
        if ($question->type !== 'multiple_choice') {
            $question->options()->delete();
        } elseif ($options !== null) {
            $question->options()->delete();

            foreach ($options as $index => $option) {
                $question->options()->create([
                    'option_text' => $option['option_text'],
                    'is_correct' => $option['is_correct'] ?? false,
                    'order' => $index + 1,
                ]);
            }
        }

        return $question->load('options');
    }

    public function destroyQuestion(QuizQuestion $question)
    {
        $question->delete();

        return response()->json(null, 204);
    }
}