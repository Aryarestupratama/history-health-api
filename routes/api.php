<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\EmailVerificationController;

use App\Http\Controllers\Admin\AdminUser\AdminUserController;
use App\Http\Controllers\Admin\ContentBlock\ContentBlockController;
use App\Http\Controllers\Admin\Era\EraController as AdminEraController;
use App\Http\Controllers\Admin\EraQuiz\EraQuizController as AdminEraQuizController;
use App\Http\Controllers\Admin\Vaccine\VaccineController as AdminVaccineController;
use App\Http\Controllers\Admin\Quiz\QuizController as AdminQuizController;
use App\Http\Controllers\Admin\Section\SectionController as AdminSectionController;
use App\Http\Controllers\Admin\Year\YearController as AdminYearController;
use App\Http\Controllers\Admin\WabahIntro\WabahIntroController as AdminWabahIntroController;

use App\Http\Controllers\Api\Public\EraController as PublicEraController;
use App\Http\Controllers\Api\Public\YearController as PublicYearController;
use App\Http\Controllers\Api\Public\SectionController as PublicSectionController;

use App\Http\Controllers\Api\HomeController;
use App\Http\Controllers\Api\Progress\ProgressController;
use App\Http\Controllers\Api\Card\CardController;
use App\Http\Controllers\Api\Quiz\UserQuizController;
use App\Http\Controllers\Api\EraQuiz\UserEraQuizController;
use App\Http\Controllers\Api\WabahIntro\WabahIntroController;

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

        // FIX: dipindah ke sini (bareng logout/me) dari grup ['auth:sanctum',
        // 'verified'] paling bawah — ganti password TIDAK termasuk daftar
        // fitur yang wajib email terverifikasi (R-AUTH-03 cuma membatasi
        // progress, kuis, collectible card), jadi tidak butuh middleware
        // 'verified'. Cukup login (auth:sanctum) seperti route auth lainnya.
        Route::post('password', [AuthController::class, 'changePassword']);
    });
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Create era sengaja ditutup — 3 era paten dari EraSeeder (lihat EraController).
    Route::apiResource('eras', AdminEraController::class)->only(['index', 'show', 'update', 'destroy']);
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

    // R-ERAQUIZ: kelola kuis sumatif era ("final boss") — tanpa batas jumlah
    // soal (beda dari kuis year yang maks. 5), tanpa syarat summary saat
    // publish. Dikelola sebagai tab baru "Kuis Sumatif" di level Era pada
    // Content Studio (Design.md, direvisi terpisah).
    Route::get('eras/{era}/quiz', [AdminEraQuizController::class, 'show']);
    Route::patch('era-quizzes/{eraQuiz}/publish', [AdminEraQuizController::class, 'publish']);
    Route::post('era-quizzes/{eraQuiz}/questions', [AdminEraQuizController::class, 'storeQuestion']);
    Route::patch('era-quiz-questions/{question}', [AdminEraQuizController::class, 'updateQuestion']);
    Route::delete('era-quiz-questions/{question}', [AdminEraQuizController::class, 'destroyQuestion']);

    // Konten singleton "Apa itu Wabah" — sengaja bukan apiResource (tidak ada
    // banyak "item", cuma 1 row yang dilihat & diedit admin).
    Route::get('wabah-intro', [AdminWabahIntroController::class, 'show']);
    Route::put('wabah-intro', [AdminWabahIntroController::class, 'update']);
});

Route::prefix('public')->group(function () {
    Route::get('eras', [PublicEraController::class, 'index']);
    Route::get('eras/{era:slug}/years', [PublicYearController::class, 'index']);
    Route::get('sections/{section}', [PublicSectionController::class, 'show']);

    // Konten "Apa itu Wabah" — sengaja di grup public (tanpa auth:sanctum),
    // guest wajib bisa lihat ini juga sebelum masuk roadmap era manapun
    // (sama prinsip dengan guest tetap bisa baca section pertama, R-YEAR-03).
    Route::get('wabah-intro', [WabahIntroController::class, 'show']);
});

// R-AUTH-03: fitur ini wajib login DAN email terverifikasi.
// Middleware 'verified' bawaan Laravel dipakai di sini — custom response
// format untuk middleware ini masih di to-do list (progress.md).
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    Route::get('home', [HomeController::class, 'index']);

    Route::post('sections/{section}/complete', [ProgressController::class, 'complete']);

    // R-QUIZ-02/09: hanya login+verified, gate detail dicek di controller (section belum tuntas).
    //
    // CATATAN (dihapus): endpoint lama `POST years/{year}/quiz/attempt`
    // (submitAttempt(), model submit-semua-jawaban-di-akhir) sudah dibuang
    // total per revisi backlog progress.md — sudah tidak dipanggil Flutter
    // sejak redesign kuis jadi progresif per-soal (answerQuestion() di
    // bawah). JANGAN disamakan dengan `POST eras/{era}/quiz/attempt` di
    // bawah (kuis sumatif era) — itu route BERBEDA, submit-sekaligus-nya
    // memang desain final (bukan peninggalan lama) dan TETAP aktif dipakai.
    Route::get('years/{year}/quiz', [UserQuizController::class, 'show']);
    Route::post('years/{year}/quiz/questions/{question}/answer', [UserQuizController::class, 'answerQuestion']);

    // R-ERAQUIZ-02/03: kuis sumatif era ("final boss") — hanya login+verified,
    // gate "semua year completed" dicek di controller (EraQuizAccessService).
    // Beda dari kuis year: submit sekaligus di akhir (bukan progresif), boleh
    // retake (overwrite), dan ADA endpoint result()/recap() terpisah karena
    // hasil kuis ditampilkan sebagai skor (bukan feedback instan per-soal).
    Route::get('eras/{era}/quiz', [UserEraQuizController::class, 'show']);
    Route::post('eras/{era}/quiz/attempt', [UserEraQuizController::class, 'submitAttempt']);
    Route::get('eras/{era}/quiz/result', [UserEraQuizController::class, 'result']);
    Route::get('eras/{era}/quiz/recap', [UserEraQuizController::class, 'recap']);

    // R-VAC-05: koleksi vaksin (dulu "cards" tokoh) — nama endpoint tetap "cards"
    // untuk minim breaking change di Flutter, tapi resource-nya sudah Vaccine.
    Route::get('cards', [CardController::class, 'index']);
    Route::get('cards/{vaccine}', [CardController::class, 'show']);
    // Ditandai "sudah dilihat" begitu animasi reveal locked->unlocked
    // selesai diputar di halaman Koleksi (badge dot & auto-scroll reveal).
    Route::post('cards/{vaccine}/seen', [CardController::class, 'markSeen']);
});