<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Api\Profile\AvatarController;
use App\Http\Controllers\Api\Profile\FrameController;
use App\Http\Controllers\Api\Profile\TutorialController;

use App\Http\Controllers\Admin\AdminUser\AdminUserController;
use App\Http\Controllers\Admin\ContentBlock\ContentBlockController;
use App\Http\Controllers\Admin\Era\EraController as AdminEraController;
use App\Http\Controllers\Admin\EraQuiz\EraQuizController as AdminEraQuizController;
use App\Http\Controllers\Admin\Vaccine\VaccineController as AdminVaccineController;
use App\Http\Controllers\Admin\Quiz\QuizController as AdminQuizController;
use App\Http\Controllers\Admin\Section\SectionController as AdminSectionController;
use App\Http\Controllers\Admin\Year\YearController as AdminYearController;
use App\Http\Controllers\Admin\YearSummary\YearSummaryController as AdminYearSummaryController;
use App\Http\Controllers\Admin\CaseStudy\CaseStudyController as AdminCaseStudyController;
use App\Http\Controllers\Admin\WabahIntro\WabahIntroController as AdminWabahIntroController;

use App\Http\Controllers\Api\Public\EraController as PublicEraController;
use App\Http\Controllers\Api\Public\YearController as PublicYearController;
use App\Http\Controllers\Api\Public\SectionController as PublicSectionController;

use App\Http\Controllers\Api\Badge\BadgeController;
use App\Http\Controllers\Api\HomeController;
use App\Http\Controllers\Api\Progress\ProgressController;
use App\Http\Controllers\Api\Card\CardController;
use App\Http\Controllers\Api\Quiz\UserQuizController;
use App\Http\Controllers\Api\EraQuiz\UserEraQuizController;
use App\Http\Controllers\Api\YearSummary\UserYearSummaryController;
use App\Http\Controllers\Api\CaseStudy\CaseStudyController as UserCaseStudyController;
use App\Http\Controllers\Api\WabahIntro\WabahIntroController;

use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

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

        // Fase 3 — Foto Profil unggahan. Sama alasan dengan
        // changePassword() di atas: BUKAN bagian dari daftar fitur
        // wajib-verified R-AUTH-03 (progress, kuis, collectible card),
        // jadi cukup auth:sanctum, tidak perlu middleware 'verified'.
        // store() dipakai juga untuk ganti foto (bukan cuma upload pertama).
        Route::post('profile/avatar', [AvatarController::class, 'store']);
        Route::delete('profile/avatar', [AvatarController::class, 'destroy']);

        // Fase 3 — pasang/lepas Border SEKALA. Sama alasan dgn avatar di
        // atas: bukan fitur wajib-verified R-AUTH-03, cukup auth:sanctum.
        // Guard "belum unlocked" ada di UpdateFrameRequest, bukan di sini.
        Route::patch('profile/frame', [FrameController::class, 'update']);

        // Status "sudah lihat tutorial onboarding" level akun — sama
        // alasan dgn avatar/frame di atas: bukan bagian R-AUTH-03, cukup
        // auth:sanctum. Dipanggil TutorialTourController (Flutter) begitu
        // step terakhir tur selesai (menggantikan flag SharedPreferences
        // murni-lokal yang salah asumsi per-device, bukan per-akun).
        Route::patch('profile/tutorial-seen', [TutorialController::class, 'markSeen']);
    });
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Create era sengaja ditutup — 3 era paten dari EraSeeder (lihat EraController).
    Route::apiResource('eras', AdminEraController::class)->only(['index', 'show', 'update', 'destroy']);
    Route::apiResource('years', AdminYearController::class);
    Route::apiResource('vaccines', AdminVaccineController::class);

    // Kelola Akun Admin -- CRUD terbatas ke user dengan role=admin, reuse
    // tabel `users` yang sudah ada (tidak perlu tabel baru). Guard
    // self-delete & last-admin-delete ada di AdminUserController.
    // REVISI: 'update' dicabut -- Kelola Admin sekarang cuma Tambah/Hapus,
    // admin tidak bisa lagi mengedit akun admin manapun (termasuk akun
    // sendiri) lewat sini. Ganti password akun sendiri pindah ke menu
    // Profil (lihat POST /auth/password di atas).
    Route::apiResource('admins', AdminUserController::class)->only(['index', 'store', 'destroy']);

    // CMS-05: assign vaccine ke year (naik level dari section -> figure lama).
    // NB: method assignVaccines() perlu ditambahkan ke YearController Anda —
    // lihat AssignVaccinesRequest.php yang sudah dibuat terpisah.
    Route::post('years/{year}/assign-vaccines', [AdminYearController::class, 'assignVaccines']);

    // Kebalikan dari assign-vaccines di atas: assign year(s) dari sisi vaksin
    // (VaccineManager.jsx) supaya admin bisa mengatur relasi year_vaccine
    // tanpa harus lewat WabahWorkspace per-tahun satu-satu. sync() dipakai
    // (bukan attach) supaya payload year_ids selalu jadi "source of truth"
    // relasi vaksin ini — kirim array kosong untuk melepas semua relasi.
    Route::post('vaccines/{vaccine}/assign-years', [AdminVaccineController::class, 'assignYears']);

    Route::apiResource('sections', AdminSectionController::class);

    Route::put('years/{year}/sections/reorder', [AdminSectionController::class, 'reorder']);

    Route::get('sections/{section}/content-blocks', [ContentBlockController::class, 'index']);
    Route::post('sections/{section}/content-blocks', [ContentBlockController::class, 'store']);
    Route::patch('sections/{section}/content-blocks/{contentBlock}', [ContentBlockController::class, 'update']);
    Route::delete('sections/{section}/content-blocks/{contentBlock}', [ContentBlockController::class, 'destroy']);
    Route::post('sections/{section}/content-blocks/reorder', [ContentBlockController::class, 'reorder']);

    // CMS-06: kelola kuis internal per year (soal TEPAT 10 + opsi jawaban).
    Route::get('years/{year}/quiz', [AdminQuizController::class, 'show']);
    Route::patch('quizzes/{quiz}/publish', [AdminQuizController::class, 'publish']);
    Route::post('quizzes/{quiz}/questions', [AdminQuizController::class, 'storeQuestion']);
    Route::patch('quiz-questions/{question}', [AdminQuizController::class, 'updateQuestion']);
    Route::delete('quiz-questions/{question}', [AdminQuizController::class, 'destroyQuestion']);

    // R-SUM: kelola Rangkuman Interaktif per year (7 poin tetap x 3 opsi,
    // R-SUM-01/02) — beda dari kuis, TIDAK ada storeQuestion/destroyQuestion
    // karena jumlah poin fixed (skeleton di-generate otomatis di show()),
    // admin cuma isi teksnya lewat updatePoint().
    Route::get('years/{year}/summary', [AdminYearSummaryController::class, 'show']);
    Route::patch('year-summary-points/{point}', [AdminYearSummaryController::class, 'updatePoint']);
    Route::patch('year-summaries/{yearSummary}/publish', [AdminYearSummaryController::class, 'publish']);

    // R-CASE (baru, Fase 1): kelola Studi Kasus per section ber-type
    // case_study (selalu order=8). BEDA dari kuis maupun rangkuman: opsi
    // (5, tepat) di-update IN-PLACE lewat updateOptions() (bukan
    // storeQuestion/destroyQuestion ala kuis, bukan pula delete+recreate
    // ala updatePointOptions rangkuman) — lihat catatan class-level
    // CaseStudyService kenapa tidak boleh delete+recreate.
    Route::get('sections/{section}/case-study', [AdminCaseStudyController::class, 'show']);
    Route::patch('case-studies/{caseStudy}', [AdminCaseStudyController::class, 'updateContent']);
    Route::patch('case-studies/{caseStudy}/options', [AdminCaseStudyController::class, 'updateOptions']);
    Route::patch('case-studies/{caseStudy}/publish', [AdminCaseStudyController::class, 'publish']);

    // R-ERAQUIZ (REVISI TOTAL): kuis sumatif era ("final boss") TIDAK LAGI
    // punya bank soal sendiri — soal ditarik otomatis dari kuis formatif
    // (quiz_questions) tiap year saat user mengerjakan. Admin cukup toggle
    // publish() di sini begitu SEMUA year di era ini sudah publish kuis
    // formatifnya masing-masing (dikelola di tab Kuis pada WabahWorkspace,
    // bukan lagi di tab/komponen terpisah level Era).
    Route::get('eras/{era}/quiz', [AdminEraQuizController::class, 'show']);
    Route::patch('era-quizzes/{eraQuiz}/publish', [AdminEraQuizController::class, 'publish']);

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
    // R-QUIZ-08 (baru — boleh retake sampai lulus): reset attempt yang
    // belum lulus (skor < 75%) supaya bisa dikerjakan ulang dari soal
    // pertama. Ditolak 422 kalau attempt sudah lulus (lihat
    // QuizAttemptService::retry()).
    Route::post('years/{year}/quiz/retry', [UserQuizController::class, 'retry']);

    // SUM-01/02/05/06: Rangkuman Interaktif — gate "semua section completed"
    // dicek inline di controller (sama pola dengan UserQuizController).
    // checkAnswer() per poin TIDAK menyimpan apa pun ke DB (feedback instan
    // murni dihitung ulang tiap request); submit() di poin ke-7 yang baru
    // mempersist status akhir (overwrite kalau retake, R-SUM-11) sekaligus
    // jadi syarat baru tombol "Kerjakan Kuis" (SUM-06).
    Route::get('years/{year}/summary', [UserYearSummaryController::class, 'show']);
    Route::post('years/{year}/summary/points/{point}/answer', [UserYearSummaryController::class, 'checkAnswer']);
    Route::post('years/{year}/summary/complete', [UserYearSummaryController::class, 'submit']);

    // R-CASE (baru, Fase 1): Studi Kasus — gate akses SAMA dengan section
    // manapun (SectionAccessService::isUnlocked(), dicek eksplisit di
    // controller, sama pola dengan UserYearSummaryController). Section
    // case_study TIDAK BISA diselesaikan lewat
    // `POST sections/{section}/complete` biasa di atas (lihat guard di
    // ProgressController::complete()) — satu-satunya jalan sah adalah
    // submit yang BENAR lewat endpoint kedua di bawah.
    Route::get('sections/{section}/case-study', [UserCaseStudyController::class, 'show']);
    Route::post('sections/{section}/case-study/submit', [UserCaseStudyController::class, 'submit']);

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

    // R-CASE (Fase 2): Koleksi Badge — derived dari CaseStudy published +
    // UserCaseStudyAttempt.completed_at (sticky), TIDAK ada tabel badges
    // terpisah. Pola sama dengan Koleksi Vaksin (cards) di atas, bedanya
    // badge locked TETAP mengirim nama/ikon asli (lihat BadgeResource) —
    // Flutter yang meredupkan tampilannya, bukan disamarkan di backend.
    Route::get('badges', [BadgeController::class, 'index']);
    // Dot merah / tag "Baru" — ditandai "sudah dilihat" begitu user beneran
    // membuka detail badge di Koleksi Badge, sama pola & titik panggil
    // dengan `POST cards/{vaccine}/seen` di atas.
    Route::patch('badges/{caseStudy}/seen', [BadgeController::class, 'markSeen']);
});