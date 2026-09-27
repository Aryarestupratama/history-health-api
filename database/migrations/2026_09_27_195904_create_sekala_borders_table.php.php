<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel singleton (1 row) untuk aset Border SEKALA yang dikelola Admin.
 *
 * SEBELUMNYA border murni aset statis Flutter (Image.asset placeholder
 * gradient), TANPA CMS sama sekali -- lihat progress.md "Border SEKALA
 * & Foto Profil (Fase 3)". Sekarang admin bisa ganti gambar border tanpa
 * perlu build ulang app, polanya SAMA PERSIS dengan `wabah_intro`
 * (singleton, `image_link` mentah dari Google Drive, `is_published`
 * sebagai gate tampil-tidaknya ke user).
 *
 * PENTING -- yang TIDAK berubah sama sekali dari fitur ini: seluruh
 * logic UNLOCK border (`users.frame_unlocked_at`, `BorderUnlockService`,
 * R-FRAME-01/02 di Schema.md) sudah ada sejak Fase 3 dan TIDAK disentuh
 * migration ini. Tabel ini CUMA soal aset gambarnya, bukan soal kapan
 * border terbuka untuk user.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sekala_borders', function (Blueprint $table) {
            $table->id();
            // Link Google Drive mentah, sama pola dengan `wabah_intro.image_link`
            // & `vaccines.photo` -- konversi ke direct-view URL terjadi di
            // accessor model (`getImageUrlAttribute()`), BUKAN disimpan di sini.
            $table->text('image_link')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sekala_borders');
    }
};