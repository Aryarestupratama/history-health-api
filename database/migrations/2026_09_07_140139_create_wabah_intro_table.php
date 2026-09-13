<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel singleton (selalu cuma 1 row) untuk konten pengenalan "Apa itu Wabah".
 *
 * Global, tidak terikat era/year manapun — diakses hanya lewat satu
 * entry point: ikon info di header roadmap era pada tab Informasi
 * Sejarah. Tidak ada auto-show maupun banner per-era.
 *
 * Format konten: murni infografis (link Google Drive, pola sama dengan
 * years.summary_image & content_blocks) — tanpa teks pendukung.
 * Konversi ke direct-view URL dilakukan di layer API response
 * (accessor image_url), bukan disimpan di DB — konsisten dengan
 * Schema.md §5 (Catatan Khusus Media).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wabah_intro', function (Blueprint $table) {
            $table->id();
            // Raw link Google Drive, apa adanya dari input admin
            $table->text('image_link')->nullable();
            // Admin bisa draft dulu sebelum konten ini tayang ke user
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wabah_intro');
    }
};