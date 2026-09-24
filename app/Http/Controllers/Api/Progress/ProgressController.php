<?php

namespace App\Http\Controllers\Api\Progress;

use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Services\Progress\ProgressService;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProgressController extends Controller
{
    public function __construct(private ProgressService $progressService)
    {
    }

    public function complete(Request $request, Section $section)
    {
        // Sama seperti Public\SectionController: draft dianggap 404,
        // supaya tidak ada cara "menyelesaikan" section yang belum tayang.
        if (! $section->is_published) {
            throw new NotFoundHttpException();
        }

        // (Baru — Fase 1 Studi Kasus, progress.md) Section bertipe
        // `case_study` (selalu order=8) TIDAK BOLEH diselesaikan lewat
        // endpoint umum ini — supaya tidak ada cara melewati evaluasi hard-
        // order studi kasus lewat API. Satu-satunya jalan sah adalah submit
        // yang BENAR lewat CaseStudyController (lihat
        // CaseStudyService::completeSectionIfNeeded()).
        if ($section->isCaseStudy()) {
            return response()->json([
                'message' => 'Section studi kasus hanya bisa diselesaikan dengan mengerjakan Ruang Keputusan dengan benar, bukan lewat endpoint ini.',
            ], 403);
        }

        $result = $this->progressService->completeSection($request->user(), $section);

        return response()->json([
            'message' => $result['progress']->wasRecentlyCreated
                ? 'Section marked as completed.'
                : 'Section was already completed.',
            'completed_at' => $result['progress']->completed_at,
            // R-PROG-07/08: status "year completed" (semua section + quiz
            // year tsb selesai) dievaluasi ulang setiap kali complete() ini
            // dipanggil — lihat ProgressService::completeSection().
            'year_completed' => $result['year_completed'],
            // R-VAC-01/02: unlock kini terjadi di level year (via YearCompletionService),
            // bukan lagi langsung per section — lihat ProgressService::completeSection().
            'newly_unlocked_vaccine_ids' => $result['newly_unlocked_vaccines']->values(),
        ]);
    }
}