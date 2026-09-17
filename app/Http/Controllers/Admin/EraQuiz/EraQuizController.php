<?php

namespace App\Http\Controllers\Admin\EraQuiz;

use App\Http\Controllers\Controller;
use App\Models\Era;
use App\Models\EraQuiz;
use Illuminate\Http\Request;

/**
 * REVISI BESAR: kuis sumatif era TIDAK LAGI punya bank soal sendiri untuk
 * dikelola admin — soal ditarik otomatis dari kuis FORMATIF (quiz_questions)
 * milik tiap year dalam era ini. Method storeQuestion()/updateQuestion()/
 * destroyQuestion() DIHAPUS TOTAL, admin cukup:
 * (1) isi & publish kuis formatif tiap year (WabahWorkspace::QuizTab, 10
 *     soal per year, sudah ada dari sebelumnya), lalu
 * (2) toggle publish() di sini begitu SEMUA year sudah published.
 */
class EraQuizController extends Controller
{
    /**
     * GET /admin/eras/{era}/quiz — ambil (atau buat draft baru) kuis
     * sumatif milik era, plus breakdown status tiap year (published atau
     * belum, dan berapa kuota soal yang akan diambil darinya kalau semua
     * sudah published) supaya admin tahu apa yang masih kurang.
     */
    public function show(Era $era)
    {
        $eraQuiz = EraQuiz::firstOrCreate(
            ['era_id' => $era->id],
            ['is_published' => false]
        );

        $years = $era->years()->with('quiz')->orderBy('id')->get();
        $quotas = $eraQuiz->canPublish() ? $eraQuiz->questionQuotaPerYear() : [];

        return response()->json([
            'id' => $eraQuiz->id,
            'era_id' => $eraQuiz->era_id,
            'is_published' => $eraQuiz->is_published,
            'attempt_question_count' => EraQuiz::ATTEMPT_QUESTION_COUNT,
            'can_publish' => $eraQuiz->canPublish(),
            'years' => $years->map(fn ($year) => [
                'id' => $year->id,
                'year' => $year->year,
                'title' => $year->title,
                'quiz_published' => (bool) $year->quiz?->is_published,
                'quiz_question_count' => $year->quiz?->questions()->count() ?? 0,
                // Kuota soal yang akan diambil dari year ini SAAT user
                // mengerjakan kuis sumatif — cuma terisi kalau eraQuiz
                // sudah bisa dipublish (semua year published), null kalau
                // belum (supaya admin tidak salah kira ini angka final).
                'quota_if_published' => $quotas[$year->id] ?? null,
            ]),
        ]);
    }

    /**
     * PATCH /admin/era-quizzes/{eraQuiz}/publish — toggle publish.
     * R-ERAQUIZ-10 (REVISI TOTAL): syarat sekarang SEMUA year dalam era
     * ini sudah punya kuis formatif published (EraQuiz::canPublish()) —
     * bukan lagi soal jumlah/lengkap-nya bank sumatif sendiri (sudah
     * tidak ada bank sumatif sendiri).
     */
    public function publish(Request $request, EraQuiz $eraQuiz)
    {
        $wantsPublish = (bool) $request->boolean('is_published');

        if ($wantsPublish && ! $eraQuiz->canPublish()) {
            return response()->json([
                'message' => 'Kuis sumatif belum bisa dipublish. Pastikan SEMUA tahun di era ini sudah punya kuis formatif (10 soal) yang sudah dipublish.',
            ], 422);
        }

        $eraQuiz->update(['is_published' => $wantsPublish]);

        return $eraQuiz;
    }
}