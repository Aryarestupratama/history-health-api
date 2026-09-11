<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel singleton (selalu cuma 1 row) untuk konten pengenalan "Apa itu Wabah".
 *
 * Global, tidak terikat era/year manapun — dipakai sebagai:
 * - Modal otomatis saat user pertama kali buka tab Informasi Sejarah
 * - Konten yang bisa dibuka ulang lewat ikon info di header roadmap
 * - Konten yang sama dibuka dari banner/node "Apa itu Wabah?" di setiap era
 *
 * Format konten: infografis (link Google Drive, pola sama dengan
 * years.summary_image & content_blocks) + caption teks pendukung opsional.
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
            // Teks pendukung singkat di bawah infografis, opsional
            $table->text('caption')->nullable();
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