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
     * R-QUIZ-05/06 (revisi): TEPAT 10 soal (bukan lagi "minimal 1") +
     * years.summary terisi.
     */
    public function publish(Request $request, Quiz $quiz)
    {
        $wantsPublish = (bool) $request->boolean('is_published');

        if ($wantsPublish && ! $quiz->canPublish()) {
            return response()->json([
                'message' => 'Kuis belum bisa dipublish. Pastikan TEPAT '.Quiz::QUESTION_COUNT.' soal sudah dibuat (tidak boleh kurang/lebih), rangkuman tahun (years.summary) sudah terisi, dan setiap soal sudah punya penjelasan untuk jawaban benar maupun salah (explanation_correct & explanation_incorrect).',
            ], 422);
        }

        $quiz->update(['is_published' => $wantsPublish]);

        return $quiz;
    }

    /**
     * POST /admin/quizzes/{quiz}/questions
     * R-QUIZ-06 (revisi): maksimal Quiz::QUESTION_COUNT (10) soal — dulu
     * cuma maks 5. Publish tetap butuh TEPAT 10 (dicek di Quiz::canPublish()),
     * limit di sini cuma mencegah admin bikin soal ke-11 dst.
     * R-QUIZ-07: multiple_choice wajib >=2 opsi dengan tepat satu is_correct.
     */
    public function storeQuestion(StoreQuizQuestionRequest $request, Quiz $quiz)
    {
        if ($quiz->questions()->count() >= Quiz::QUESTION_COUNT) {
            return response()->json([
                'message' => 'Maksimal '.Quiz::QUESTION_COUNT.' soal per kuis (R-QUIZ-06).',
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

        // FIX: sama alasan seperti 'question' di atas — explanation_correct
        // & explanation_incorrect juga NOT NULL di DB (lihat migration
        // create_quiz_questions_table), sementara skeleton soal dari
        // addQuestion() mengirim keduanya sebagai "" -> null via middleware.
        $data['explanation_correct'] = $data['explanation_correct'] ?? '';
        $data['explanation_incorrect'] = $data['explanation_incorrect'] ?? '';

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

        // FIX: sama alasan seperti 'question' di atas — pakai
        // array_key_exists (bukan isset/??), supaya field ini tidak ikut
        // ditimpa '' kalau memang tidak dikirim di body PATCH (partial
        // update), tapi tetap di-fallback '' kalau dikirim sebagai null.
        if (array_key_exists('explanation_correct', $data)) {
            $data['explanation_correct'] = $data['explanation_correct'] ?? '';
        }

        if (array_key_exists('explanation_incorrect', $data)) {
            $data['explanation_incorrect'] = $data['explanation_incorrect'] ?? '';
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