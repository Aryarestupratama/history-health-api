<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('year_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('year_id')->constrained('years')->cascadeOnDelete();
            $table->boolean('is_published')->default(false); // muncul ke user jika true. Wajib tepat 7 year_summary_points, tiap poin tepat 3 opsi dengan tepat 1 is_correct=true, sebelum bisa di-set true (divalidasi di aplikasi, YearSummary::canPublish())
            $table->timestamps();

            // 1 wabah (year) hanya punya 1 Rangkuman Interaktif — pola sama dengan quizzes.year_id
            $table->unique('year_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('year_summaries');
    }
};