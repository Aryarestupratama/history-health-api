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
            $table->json('answers')->nullable(); // opsional: rekap jawaban user, tidak dipakai untuk skor
            $table->timestamp('completed_at')->nullable();

            // Idempotent, selaras pola user_progress: 1 user hanya 1 record per quiz
            $table->unique(['user_id', 'quiz_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_quiz_attempts');
    }
};