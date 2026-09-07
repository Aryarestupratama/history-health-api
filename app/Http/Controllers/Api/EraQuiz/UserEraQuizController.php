<?php

namespace App\Http\Controllers\Api\EraQuiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\EraQuiz\StoreEraQuizAttemptRequest;
use App\Models\Era;
use App\Models\UserEraQuizAttempt;
use App\Services\Era\EraQuizAccessService;
use App\Services\Era\EraQuizAttemptService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class UserEraQuizController extends Controller
{
    public function __construct(
        private EraQuizAccessService $access,
        private EraQuizAttemptService $attempts,
    ) {
    }

    /**
     * GET /api/eras/{era}/quiz
     * R-ERAQUIZ-02: hanya bisa diambil jika SELURUH year dalam era ini
     * sudah "completed" oleh user. R-ERAQUIZ-03: guest tidak bisa akses
     * (endpoint ini ada di grup middleware auth:sanctum + verified).
     *
     * Soal ditampilkan 1-per-halaman di Flutter (sama pola tampilan dengan
     * kuis year), tapi TIDAK ada kunci jawaban yang dikirim di sini — sama
     * filosofi dengan UserQuizController::show().
     */
    public function show(Request $request, Era $era)
    {
        $eraQuiz = $era->eraQuiz;

        if (! $eraQuiz || ! $eraQuiz->is_published) {
            throw new NotFoundHttpException();
        }

        if (! $this->access->isUnlocked($request->user(), $era)) {
            return response()->json([
                'message' => 'Selesaikan seluruh tahun pada era ini terlebih dahulu sebelum mengerjakan kuis sumatif.',
            ], 403);
        }

        return $eraQuiz->load(['questions' => function ($q) {
            $q->select('id', 'era_quiz_id', 'order', 'question');
        }, 'questions.options:id,era_quiz_question_id,option_text,order']);
    }

    /**
     * POST /api/eras/{era}/quiz/attempt
     * R-ERAQUIZ-04: submit sekali di akhir, WAJIB seluruh soal terjawab
     * (validasi kelengkapan ada di StoreEraQuizAttemptRequest) — beda dari
     * kuis year yang progresif per-soal.
     * R-ERAQUIZ-08: boleh retake, setiap submit meng-OVERWRITE attempt yang
     * sama (bukan bikin row baru) via EraQuizAttemptService::submit().
     *
     * Response berisi ringkasan skor untuk halaman Hasil — BEDA dari kuis
     * year yang sengaja "tanpa skor". Detail per-soal (untuk halaman Rekap)
     * TIDAK dikirim di sini, diambil terpisah lewat recap() supaya payload
     * halaman Hasil tetap ringkas.
     */
    public function submitAttempt(StoreEraQuizAttemptRequest $request, Era $era)
    {
        $eraQuiz = $era->eraQuiz;

        if (! $eraQuiz || ! $eraQuiz->is_published) {
            throw new NotFoundHttpException();
        }

        if (! $this->access->isUnlocked($request->user(), $era)) {
            return response()->json([
                'message' => 'Selesaikan seluruh tahun pada era ini terlebih dahulu sebelum mengerjakan kuis sumatif.',
            ], 403);
        }

        $answers = $request->validated()['answers'];

        $attempt = $this->attempts->submit($request->user(), $eraQuiz, $answers);
        $result = $this->attempts->buildResult($attempt);

        return response()->json([
            // Kalimat template selamat, dipakai langsung di halaman Hasil.
            'message' => "Selamat! Kamu sudah menyelesaikan kuis sumatif era {$era->name}.",
            'completed_at' => $attempt->completed_at,
            'result' => $result,
        ]);
    }

    /**
     * GET /api/eras/{era}/quiz/result
     * Ambil ulang ringkasan skor dari attempt TERAKHIR (tanpa submit ulang)
     * — dipakai kalau user kembali dari halaman Rekap ke halaman Hasil,
     * atau membuka lagi halaman Hasil di sesi berikutnya.
     */
    public function result(Request $request, Era $era)
    {
        $attempt = $this->latestAttemptOrFail($request, $era);

        return response()->json([
            'completed_at' => $attempt->completed_at,
            'result' => $this->attempts->buildResult($attempt),
        ]);
    }

    /**
     * GET /api/eras/{era}/quiz/recap
     * R-ERAQUIZ-05: rekap SEMUA soal dalam 1 respons (ditampilkan 1 halaman
     * scroll di Flutter) — opsi benar di-highlight hijau, opsi user yang
     * salah di-highlight merah, beserta explanation yang sesuai.
     */
    public function recap(Request $request, Era $era)
    {
        $attempt = $this->latestAttemptOrFail($request, $era);

        $recap = $this->attempts->buildRecap($attempt)->map(fn ($item) => [
            'question_id' => $item['question']->id,
            'question' => $item['question']->question,
            'options' => $item['question']->options->map(fn ($option) => [
                'id' => $option->id,
                'option_text' => $option->option_text,
            ]),
            'selected_option_id' => $item['selected_option_id'],
            'correct_option_id' => $item['correct_option_id'],
            'is_correct' => $item['is_correct'],
            'explanation' => $item['explanation'],
        ]);

        return response()->json([
            'completed_at' => $attempt->completed_at,
            'questions' => $recap,
        ]);
    }

    private function latestAttemptOrFail(Request $request, Era $era): UserEraQuizAttempt
    {
        $eraQuiz = $era->eraQuiz;

        if (! $eraQuiz) {
            throw new NotFoundHttpException();
        }

        $attempt = UserEraQuizAttempt::where('user_id', $request->user()->id)
            ->where('era_quiz_id', $eraQuiz->id)
            ->first();

        if (! $attempt) {
            throw new NotFoundHttpException();
        }

        return $attempt;
    }
}