<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Admin\ContentBlock\ContentBlockController;
use App\Http\Controllers\Admin\Era\EraController;
use App\Http\Controllers\Admin\Figure\FigureController;
use App\Http\Controllers\Admin\Section\SectionController;
use App\Http\Controllers\Admin\Year\YearController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::get('google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('google/callback', [AuthController::class, 'googleCallback']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);

        Route::post('email/verify/resend', [EmailVerificationController::class, 'resend']);
        Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
            ->middleware(['signed'])
            ->name('verification.verify');
    });

    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
        Route::apiResource('eras', EraController::class);
        Route::apiResource('years', YearController::class);
        Route::apiResource('figures', FigureController::class);

        Route::apiResource('sections', SectionController::class);
        Route::post('sections/{section}/assign-figures', [SectionController::class, 'assignFigures']);

        Route::get('sections/{section}/content-blocks', [ContentBlockController::class, 'index']);
        Route::post('sections/{section}/content-blocks', [ContentBlockController::class, 'store']);
        Route::patch('sections/{section}/content-blocks/{contentBlock}', [ContentBlockController::class, 'update']);
        Route::delete('sections/{section}/content-blocks/{contentBlock}', [ContentBlockController::class, 'destroy']);
        Route::post('sections/{section}/content-blocks/reorder', [ContentBlockController::class, 'reorder']);
    });
});