<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_year_summary_completions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('year_summary_id')->constrained('year_summaries')->cascadeOnDelete();

            // true jika user benar di percobaan pertama pada SELURUH 7 poin (attempt terkini).
            // Murni untuk badge kosmetik "Sempurna!" saat Rangkuman Lengkap dibuka ulang —
            // tidak memengaruhi logic apa pun selain tampilan (bukan skor/nilai).
            $table->boolean('is_perfect')->default(false);

            // Diperbarui (bukan dipertahankan) setiap kali user retake ("Kerjakan Ulang").
            $table->timestamp('completed_at');

            $table->timestamps();

            // BOLEH ditimpa (updateOrCreate) saat retake — sama filosofi dengan
            // user_era_quiz_attempts, BUKAN insert-once seperti user_quiz_attempts.
            // Sengaja TIDAK menyimpan jawaban per poin (tidak ada kolom `answers`
            // json seperti di tabel kuis) — hanya status akhir yang disimpan.
            $table->unique(['user_id', 'year_summary_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_year_summary_completions');
    }
};