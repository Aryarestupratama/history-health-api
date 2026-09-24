<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('year_id')->constrained('years')->cascadeOnDelete();

            // `title` DIPERTAHANKAN di DB — tetap dipakai sebagai label section
            // di sidebar Content Studio (admin) & untuk identifikasi internal.
            // TIDAK LAGI dirender sebagai judul di layar Detail Section end-user
            // (Flutter) — posisi paling atas digantikan `header_image` (di bawah).
            $table->string('title');

            // (Baru) Header gambar section — OPSIONAL, boleh diisi boleh tidak per
            // section (bukan wajib, bukan pula 1x per year). Raw link Google Drive,
            // diparse ke direct-view URL di response layer (pola sama dengan
            // content_blocks tipe image). Kalau kosong, layar Detail Section render
            // tanpa header gambar di paling atas (fallback ke konten langsung).
            $table->string('header_image')->nullable();

            // (Baru — Fase 1 Studi Kasus, progress.md) Section bertipe `reading`
            // (default, section bacaan biasa dengan content_blocks) atau
            // `case_study` (section ke-8 setiap year, konten dikelola lewat
            // tabel case_studies, BUKAN content_blocks). Ditambahkan lewat edit
            // langsung migration ini (bukan migration `alter` terpisah) karena
            // belum ada data produksi saat perubahan ini dibuat.
            //
            // R-CASE (rencana): `order = 8` HANYA boleh dipakai oleh section
            // bertipe `case_study`, dan sebaliknya section `case_study` HARUS
            // `order = 8` — tidak ditegakkan sebagai constraint DB di sini
            // (sama filosofi dengan "tepat 7 poin" year_summaries yang juga
            // divalidasi di layer aplikasi), lihat Service/FormRequest terkait.
            $table->enum('type', ['reading', 'case_study'])->default('reading');

            $table->integer('order')->default(0); // urutan section dalam 1 year; menentukan section mana yang terbuka/terkunci (section N+1 baru terbuka jika section N sudah completed di user_progress)
            $table->boolean('is_published')->default(false);
            $table->timestamps();

            // Cegah 2 section dalam year yang sama punya `order` sama —
            // wajib untuk menjaga sequential unlock tetap unambiguous (R-SECT-01/02)
            $table->unique(['year_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};