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

        // FIX: StoreQuizQuestionRequest sengaja bikin 'question' nullable
        // (QuizTab::addQuestion() di WabahWorkspace.jsx mengirim question: ""
        // dulu untuk skeleton soal, diisi belakangan via updateQuestion()).
        // Middleware ConvertEmptyStringsToNull mengubah "" jadi null SEBELUM
        // validasi -> lolos rule 'nullable', tapi kolom quiz_questions.question
        // di DB NOT NULL tanpa default -> insert null gagal (pola identik
        // dengan fix ContentBlockController::store() sebelumnya).
        $data['question'] = $data['question'] ?? '';

        $data['order'] = $quiz->questions()->max('order') + 1;

        $question = $quiz->questions()->create($data);

        // R-QUIZ-07: kuis murni pilihan ganda — opsi selalu diproses, tidak
        // ada lagi percabangan tipe soal.
        foreach ($options as $index => $option) {
            $question->options()->create([
                // FIX: sama alasan seperti 'question' di atas —
                // option_text: "" dari addQuestion() jadi null via
                // middleware, sementara quiz_question_options.option_text
                // NOT NULL di DB.
                'option_text' => $option['option_text'] ?? '',
                'is_correct' => $option['is_correct'] ?? false,
                'order' => $index + 1,
            ]);
        }

        return response()->json($question->load('options'), 201);
    }

    public function updateQuestion(UpdateQuizQuestionRequest $request, QuizQuestion $question)
    {
        $data = $request->validated();
        $options = $data['options'] ?? null;
        unset($data['options']);

        // FIX: 'question' nullable di UpdateQuizQuestionRequest (sama alasan
        // seperti store) — kalau field ini memang ikut dikirim di body PATCH
        // tapi nilainya null (mis. admin sempat mengosongkan textarea), jangan
        // sampai lolos ke DB sebagai null. Pakai array_key_exists, bukan
        // isset/?? saja, supaya tidak menimpa 'question' dengan '' kalau field
        // ini memang tidak ikut dikirim di request (PATCH partial update).
        if (array_key_exists('question', $data)) {
            $data['question'] = $data['question'] ?? '';
        }

        $question->update($data);

        // R-QUIZ-07: opsi jawaban di-replace penuh saat diedit, lebih sederhana
        // daripada diff per-opsi dan cukup untuk kebutuhan admin CMS ini.
        // Tidak ada lagi percabangan tipe soal — kuis murni pilihan ganda.
        if ($options !== null) {
            $question->options()->delete();

            foreach ($options as $index => $option) {
                $question->options()->create([
                    // FIX: option_text: "" dari OptionsEditor::addOption()
                    // jadi null via middleware, kolom NOT NULL di DB.
                    'option_text' => $option['option_text'] ?? '',
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