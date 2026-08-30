<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\EmailVerificationController;

use App\Http\Controllers\Admin\AdminUser\AdminUserController;
use App\Http\Controllers\Admin\ContentBlock\ContentBlockController;
use App\Http\Controllers\Admin\Era\EraController as AdminEraController;
use App\Http\Controllers\Admin\Vaccine\VaccineController as AdminVaccineController;
use App\Http\Controllers\Admin\Quiz\QuizController as AdminQuizController;
use App\Http\Controllers\Admin\Section\SectionController as AdminSectionController;
use App\Http\Controllers\Admin\Year\YearController as AdminYearController;

use App\Http\Controllers\Api\Public\EraController as PublicEraController;
use App\Http\Controllers\Api\Public\YearController as PublicYearController;
use App\Http\Controllers\Api\Public\SectionController as PublicSectionController;

use App\Http\Controllers\Api\HomeController;
use App\Http\Controllers\Api\Progress\ProgressController;
use App\Http\Controllers\Api\Card\CardController;
use App\Http\Controllers\Api\Quiz\UserQuizController;

use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::get('google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('google/callback', [AuthController::class, 'googleCallback']);

    // Dipindah keluar dari group auth:sanctum karena link ini diklik dari email
    // di browser (tidak membawa Sanctum token). Keamanannya dijamin oleh
    // middleware 'signed' (expires + signature) dan validasi hash di controller.
    Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware(['signed'])
        ->name('verification.verify');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);

        Route::post('email/verify/resend', [EmailVerificationController::class, 'resend']);
    });
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::apiResource('eras', AdminEraController::class);
    Route::apiResource('years', AdminYearController::class);
    Route::apiResource('vaccines', AdminVaccineController::class);

    // Kelola Akun Admin (baru) -- CRUD terbatas ke user dengan role=admin,
    // reuse tabel `users` yang sudah ada (tidak perlu tabel baru). Guard
    // self-delete & last-admin-delete ada di AdminUserController.
    Route::apiResource('admins', AdminUserController::class)->only(['index', 'store', 'update', 'destroy']);

    // CMS-05: assign vaccine ke year (naik level dari section -> figure lama).
    // NB: method assignVaccines() perlu ditambahkan ke YearController Anda —
    // lihat AssignVaccinesRequest.php yang sudah dibuat terpisah.
    Route::post('years/{year}/assign-vaccines', [AdminYearController::class, 'assignVaccines']);

    Route::apiResource('sections', AdminSectionController::class);

    Route::put('years/{year}/sections/reorder', [AdminSectionController::class, 'reorder']);

    Route::get('sections/{section}/content-blocks', [ContentBlockController::class, 'index']);
    Route::post('sections/{section}/content-blocks', [ContentBlockController::class, 'store']);
    Route::patch('sections/{section}/content-blocks/{contentBlock}', [ContentBlockController::class, 'update']);
    Route::delete('sections/{section}/content-blocks/{contentBlock}', [ContentBlockController::class, 'destroy']);
    Route::post('sections/{section}/content-blocks/reorder', [ContentBlockController::class, 'reorder']);

    // CMS-06: kelola kuis internal per year (soal maks. 5 + opsi jawaban).
    Route::get('years/{year}/quiz', [AdminQuizController::class, 'show']);
    Route::patch('quizzes/{quiz}/publish', [AdminQuizController::class, 'publish']);
    Route::post('quizzes/{quiz}/questions', [AdminQuizController::class, 'storeQuestion']);
    Route::patch('quiz-questions/{question}', [AdminQuizController::class, 'updateQuestion']);
    Route::delete('quiz-questions/{question}', [AdminQuizController::class, 'destroyQuestion']);
});

Route::prefix('public')->group(function () {
    Route::get('eras', [PublicEraController::class, 'index']);
    Route::get('eras/{era:slug}/years', [PublicYearController::class, 'index']);
    Route::get('sections/{section}', [PublicSectionController::class, 'show']);
});

// R-AUTH-03: fitur ini wajib login DAN email terverifikasi.
// Middleware 'verified' bawaan Laravel dipakai di sini — custom response
// format untuk middleware ini masih di to-do list (progress.md).
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    Route::get('home', [HomeController::class, 'index']);

    Route::post('sections/{section}/complete', [ProgressController::class, 'complete']);

    // R-QUIZ-02/09: hanya login+verified, gate detail dicek di controller (section belum tuntas).
    Route::get('years/{year}/quiz', [UserQuizController::class, 'show']);
    Route::post('years/{year}/quiz/attempt', [UserQuizController::class, 'submitAttempt']);

    // R-VAC-05: koleksi vaksin (dulu "cards" tokoh) — nama endpoint tetap "cards"
    // untuk minim breaking change di Flutter, tapi resource-nya sudah Vaccine.
    Route::get('cards', [CardController::class, 'index']);
    Route::get('cards/{vaccine}', [CardController::class, 'show']);
});