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

            // (Revisi) `summary` (dulu teks rangkuman) diganti jadi `summary_image` —
            // rangkuman wabah sekarang berupa infografis, disimpan sebagai raw link
            // Google Drive (diparse ke direct-view URL di response layer, sama pola
            // dengan `content_blocks.content` tipe image / `vaccines.photo`).
            // Tidak wajib diisi sebelum section publish, tapi wajib terisi sebelum
            // quiz year tsb bisa di-publish (R-QUIZ-05 tetap berlaku ke kolom ini).
            $table->string('summary_image')->nullable();

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