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
 * Format konten: teks biasa (paragraf penjelasan "Apa itu Wabah"),
 * bukan lagi infografis/link Google Drive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wabah_intro', function (Blueprint $table) {
            $table->id();
            // Teks penjelasan "Apa itu Wabah", diisi admin apa adanya
            $table->text('content')->nullable();
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