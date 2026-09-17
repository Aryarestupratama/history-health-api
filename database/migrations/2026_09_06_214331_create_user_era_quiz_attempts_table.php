<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_era_quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('era_quiz_id')->constrained('era_quizzes')->cascadeOnDelete();
            $table->json('answers')->nullable(); // object map { "<quiz_question_id>": <quiz_question_option_id>, ... } — SEKARANG merujuk ke bank soal FORMATIF per year (quiz_questions/quiz_question_options), bukan bank soal terpisah lagi (era_quiz_questions dihapus total). Hanya berisi soal hasil randomize pada attempt tsb (jumlah = EraQuiz::ATTEMPT_QUESTION_COUNT, 20, didistribusikan proporsional per year — lihat EraQuiz::questionQuotaPerYear()). Dipakai hitung skor on-the-fly, dibandingkan ke passing grade 75% untuk label lulus/tidak lulus di halaman Hasil
            $table->timestamp('completed_at')->nullable();

            // Beda dari user_quiz_attempts (year): row ini BOLEH ditimpa (retake), bukan
            // insert-once. Constraint unique tetap dipasang supaya 1 user cuma 1 row per
            // era_quiz — logic aplikasi pakai updateOrCreate() untuk overwrite `answers` &
            // `completed_at` setiap kali retake (R-ERAQUIZ-08), bukan firstOrCreate().
            $table->unique(['user_id', 'era_quiz_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_era_quiz_attempts');
    }
};