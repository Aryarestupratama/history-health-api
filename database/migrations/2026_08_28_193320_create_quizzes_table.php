<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quizzes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('year_id')->constrained('years')->cascadeOnDelete();
            $table->boolean('is_published')->default(false); // quiz baru muncul ke user jika true; admin bisa susun soal draft dulu. Wajib minimal 1 soal sebelum bisa di-set true (divalidasi di aplikasi)
            $table->timestamps();

            // 1 wabah (year) hanya punya 1 kuis
            $table->unique('year_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quizzes');
    }
};