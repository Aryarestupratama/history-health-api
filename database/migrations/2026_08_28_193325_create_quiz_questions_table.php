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
            $table->timestamps();

            // Kuis murni pilihan ganda (R-QUIZ-07) — kolom `type` (multiple_choice/essay) dan
            // `correct_answer` (referensi esai) dihapus total. Opsi jawaban selalu ada di
            // quiz_question_options, minimal 2 opsi dengan tepat satu is_correct = true.

            // Maksimal 5 soal per quiz divalidasi di level aplikasi (Laravel), bukan constraint DB
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_questions');
    }
};