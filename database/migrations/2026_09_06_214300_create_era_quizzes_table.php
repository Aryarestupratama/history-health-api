<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('era_quizzes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('era_id')->constrained('eras')->cascadeOnDelete();
            $table->boolean('is_published')->default(false); // quiz sumatif baru muncul ke user jika true; wajib TOTAL soal gabungan (seluruh year_id dalam era ini) minimal 20 + tiap soal punya explanation_correct & explanation_incorrect terisi sebelum bisa di-set true (divalidasi di aplikasi, EraQuiz::canPublish()) — minimal 20 supaya randomize 20 soal saat attempt selalu terpenuhi
            $table->timestamps();

            // 1 era hanya punya 1 kuis sumatif (R-ERAQUIZ-01)
            $table->unique('era_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('era_quizzes');
    }
};