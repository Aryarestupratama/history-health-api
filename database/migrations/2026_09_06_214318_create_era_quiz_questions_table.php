<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('era_quiz_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('era_quiz_id')->constrained('era_quizzes')->cascadeOnDelete();
            $table->integer('order')->default(0);
            $table->text('question');
            $table->text('explanation_correct');
            $table->text('explanation_incorrect');

            $table->timestamps();

            // Tidak ada batas maksimal jumlah soal di level DB (R-ERAQUIZ-06),
            // beda dari quiz_questions (year) yang dibatasi 5 soal di level aplikasi.
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('era_quiz_questions');
    }
};