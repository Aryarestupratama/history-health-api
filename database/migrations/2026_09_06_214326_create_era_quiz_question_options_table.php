<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('era_quiz_question_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('era_quiz_question_id')->constrained('era_quiz_questions')->cascadeOnDelete();
            $table->string('option_text');
            $table->boolean('is_correct')->default(false);
            $table->integer('order')->default(0);
            $table->timestamps();

            // Setiap soal wajib minimal 2 opsi dengan tepat satu is_correct = true,
            // divalidasi di aplikasi (sama pola dengan quiz_question_options).
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('era_quiz_question_options');
    }
};