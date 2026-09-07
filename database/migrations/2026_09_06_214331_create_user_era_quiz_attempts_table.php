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
            $table->json('answers')->nullable(); // rekap jawaban user (quiz_question_option_id terpilih per soal), tidak dipakai untuk skor
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