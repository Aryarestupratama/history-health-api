<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('era_id')->constrained('eras')->cascadeOnDelete();
            $table->integer('year');
            $table->string('title');

            // (Revisi — Rangkuman Interaktif) `summary_image` DIHAPUS. Rangkuman
            // wabah tidak lagi berupa 1 link infografis statis — digantikan total
            // oleh tabel `year_summaries` (+ `year_summary_points` +
            // `year_summary_point_options`), pola "correct statement": 7 poin
            // tetap per year, tiap poin 1 kalimat benar + 2 kalimat pengecoh.
            // Lihat migration create_year_summaries_table & seterusnya.
            // Syarat publish quiz (R-QUIZ-05) yang dulu mengecek kolom ini,
            // sekarang mengecek YearSummary::canPublish().

            // (Baru) Quote — 1 teks kutipan per wabah, tampil di halaman yang sama
            // dengan rangkuman (urutan: rangkuman > quote > referensi > tombol kuis).
            $table->text('quote_text')->nullable();

            // (Baru) Referensi — list teks (mis. daftar pustaka/sumber), disimpan
            // sebagai JSON array of string. Nullable, admin boleh isi 0/beberapa item.
            $table->json('references')->nullable();

            $table->timestamps();

            // Kombinasi era_id + year unique, sesuai catatan Schema.md
            // (hapus baris ini kalau ternyata 1 tahun bisa punya >1 wabah berbeda)
            $table->unique(['era_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('years');
    }
};