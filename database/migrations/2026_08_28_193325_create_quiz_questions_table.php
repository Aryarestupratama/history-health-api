<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quiz_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
            $table->integer('order')->default(0);
            $table->text('question');
            $table->enum('type', ['multiple_choice', 'essay']);
            // Hanya relevan untuk type=essay; opsi jawaban multiple_choice ada di quiz_question_options.
            // Disimpan sebagai referensi admin saja, tidak dipakai untuk penilaian otomatis (kuis tetap tanpa skor).
            $table->text('correct_answer')->nullable();
            $table->timestamps();

            // Maksimal 5 soal per quiz divalidasi di level aplikasi (Laravel), bukan constraint DB
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_questions');
    }
};