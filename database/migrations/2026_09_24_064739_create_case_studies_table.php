<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_studies', function (Blueprint $table) {
            $table->id();

            // 1 studi kasus per section (section bertipe `case_study`, selalu
            // order=8 per year) — bukan foreignId('year_id') langsung, supaya
            // konten tetap "menempel" ke section seperti section bacaan biasa
            // (title/order/is_published sudah ada di sections), sama pola
            // relasi 1:1 dengan quizzes.year_id / year_summaries.year_id tapi
            // di sini levelnya section, bukan year.
            $table->foreignId('section_id')->constrained('sections')->cascadeOnDelete();

            // --- Layar 2: Briefing Kasus ---
            $table->string('title'); // judul studi kasus (isi admin, bukan template)
            $table->text('description'); // deskripsi (1 blok teks, bukan 3 card)
            $table->text('challenge_text'); // kolom teks tantangan

            // --- Layar 3: Ruang Keputusan ---
            // Deskripsi kolom alasan yang tampil di atas textarea alasan user
            // (isi admin, bukan template — beda dari header/sub-header/deskripsi
            // utama Ruang Keputusan yang hardcode di Flutter).
            $table->text('reason_description');

            // Feedback di TINGKAT KASUS (bukan per opsi) — tampil setelah user
            // klik Submit, tergantung hasil evaluasi hard-order di server.
            $table->text('feedback_correct');
            $table->text('feedback_incorrect');

            // --- Layar 4: Badge ---
            $table->string('badge_name');
            $table->text('badge_description')->nullable(); // opsional
            $table->string('badge_image_link'); // link Google Drive, pola sama dengan photo vaccine

            // Publish jika true. Syarat (CaseStudy::canPublish()): tepat 5
            // case_study_options, correct_rank 1/2/3 masing-masing tepat satu
            // (2 sisanya null = pengecoh), dan SELURUH kolom teks di atas
            // (termasuk kedua feedback, badge_name, badge_image_link) terisi.
            $table->boolean('is_published')->default(false);

            $table->timestamps();

            $table->unique('section_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_studies');
    }
};