<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
            $table->json('answers')->nullable(); // object map { "<quiz_question_id>": <quiz_question_option_id>, ... } — SEKARANG dipakai untuk hitung skor on-the-fly (bandingkan ke is_correct tiap opsi), bukan cuma rekap pasif. Tidak ada kolom skor tersimpan — skor & status lulus/tidak lulus (>=75%) selalu dihitung ulang dari answers TERKINI di sini
            $table->timestamp('completed_at')->nullable();

            // BEDA dari versi sebelumnya: row ini SEKARANG BOLEH ditimpa (retake), mirip
            // pola user_era_quiz_attempts. Kalau skor < 75% (passing grade), user boleh
            // kerjakan ulang — attempt lama ditimpa via updateOrCreate(), bukan insert-once
            // lagi. Constraint unique tetap dipasang supaya 1 user cuma 1 row per quiz;
            // "year completed" (R-PROG-07) kini butuh row ini ADA *dan* skor hasil hitung
            // ulang dari answers-nya >= 75%, bukan sekadar keberadaan row.
            $table->unique(['user_id', 'quiz_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_quiz_attempts');
    }
};