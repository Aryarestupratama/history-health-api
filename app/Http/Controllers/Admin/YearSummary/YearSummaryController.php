<?php

namespace App\Http\Controllers\Admin\YearSummary;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\YearSummary\UpdateYearSummaryPointRequest;
use App\Models\Year;
use App\Models\YearSummary;
use App\Models\YearSummaryPoint;
use App\Services\YearSummary\YearSummaryService;
use Illuminate\Http\Request;

class YearSummaryController extends Controller
{
    public function __construct(private YearSummaryService $service)
    {
    }

    /**
     * GET /admin/years/{year}/summary — ambil (atau buat draft baru)
     * Rangkuman Interaktif milik year. 1 rangkuman per year (unique
     * year_id di Schema.md), sama pola dengan QuizController::show().
     *
     * BEDA dari kuis: poin TIDAK ditambah manual satu-satu oleh admin —
     * begitu YearSummary dibuat, skeleton 7 poin x 3 opsi kosong langsung
     * di-generate otomatis (R-SUM-01/02), admin tinggal isi teksnya lewat
     * updatePoint() di bawah.
     */
    public function show(Year $year)
    {
        $yearSummary = YearSummary::firstOrCreate(
            ['year_id' => $year->id],
            ['is_published' => false]
        );

        $this->service->ensureSkeleton($yearSummary);

        return $yearSummary->load('points.options');
    }

    /**
     * PATCH /admin/year-summary-points/{point}
     * Isi/edit 1 poin — replace penuh 3 opsinya sekaligus (R-SUM-02: tepat
     * 3 opsi, tepat 1 is_correct=true, ditegakkan di
     * UpdateYearSummaryPointRequest). Sama pola dengan
     * QuizController::updateQuestion() yang replace penuh opsi soal.
     */
    public function updatePoint(UpdateYearSummaryPointRequest $request, YearSummaryPoint $point)
    {
        $this->service->updatePointOptions($point, $request->validated()['options']);

        return $point->load('options');
    }

    /**
     * PATCH /admin/year-summaries/{yearSummary}/publish — toggle publish.
     * R-SUM-03: tepat 7 poin, tiap poin tepat 3 opsi dengan tepat 1 benar
     * — menggantikan syarat lama "years.summary terisi" di
     * QuizController::publish() (lihat R-QUIZ-05 revisi, dependensi kuis
     * year berubah ke sini, bukan diubah di sisi ini).
     */
    public function publish(Request $request, YearSummary $yearSummary)
    {
        $wantsPublish = (bool) $request->boolean('is_published');

        if ($wantsPublish && ! $yearSummary->canPublish()) {
            return response()->json([
                'message' => 'Rangkuman Interaktif belum bisa dipublish. Pastikan seluruh 7 poin sudah terisi, dan setiap poin punya tepat 3 opsi (1 kalimat benar + 2 pengecoh) dengan tepat satu ditandai benar.',
            ], 422);
        }

        $yearSummary->update(['is_published' => $wantsPublish]);

        return $yearSummary->load('points.options');
    }
}