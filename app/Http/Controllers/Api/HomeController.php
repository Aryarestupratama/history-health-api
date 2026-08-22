<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Progress\ProgressService;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    public function __construct(private ProgressService $progressService)
    {
    }

    public function index(Request $request)
    {
        $user = $request->user();

        $progressByEra = $this->progressService->progressByEra($user)->map(fn ($p) => [
            'era' => [
                'id' => $p['era']->id,
                'name' => $p['era']->name,
                'slug' => $p['era']->slug,
            ],
            'completed' => $p['completed'],
            'total' => $p['total'],
        ]);

        $recommendation = $this->progressService->recommendation($user);

        return response()->json([
            'progress_by_era' => $progressByEra,
            'recommendation' => $recommendation ? $this->formatRecommendation($recommendation) : null,
        ]);
    }

    private function formatRecommendation(array $rec): array
    {
        if ($rec['type'] === 'next_year') {
            return [
                'type' => 'next_year',
                'era' => ['id' => $rec['era']->id, 'name' => $rec['era']->name, 'slug' => $rec['era']->slug],
                'year' => ['id' => $rec['year']->id, 'year' => $rec['year']->year, 'title' => $rec['year']->title],
            ];
        }

        // type === 'switch_era'
        return [
            'type' => 'switch_era',
            'era' => ['id' => $rec['era']->id, 'name' => $rec['era']->name, 'slug' => $rec['era']->slug],
        ];
    }
}