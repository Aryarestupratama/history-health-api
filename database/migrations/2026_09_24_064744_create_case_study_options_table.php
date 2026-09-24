<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_study_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_study_id')->constrained('case_studies')->cascadeOnDelete();

            $table->string('title'); // judul opsi
            $table->text('description'); // deskripsi opsi

            // Urutan tampil A-E sesuai input admin (1=A, 2=B, dst.) — urutan
            // tampil ke user di layar Ruang Keputusan BOLEH diacak per sesi
            // (R-QUIZ-13-style), tapi kolom ini tetap dipakai sebagai
            // identitas stabil opsi (dropdown admin "Prioritas 1/2/3/Pengecoh"
            // merujuk ke row ini via id, bukan posisi acak).
            $table->integer('order')->default(0);

            // 1/2/3 untuk opsi yang termasuk 3 prioritas benar (posisi baku
            // hasil evaluasi HARD — urutan harus persis sama, bukan bebas),
            // NULL untuk 2 opsi pengecoh. Wajib: tepat satu opsi per nilai
            // 1/2/3, tepat 2 opsi null, dari total tepat 5 opsi — divalidasi
            // di aplikasi (CaseStudy::canPublish()), bukan constraint DB
            // (pola sama dengan year_summary_point_options.is_correct).
            //
            // PENTING (keputusan desain, progress.md): kolom ini TIDAK BOLEH
            // pernah muncul di response GET milik user (`/case-studies/...`)
            // — hanya dipakai di server saat evaluasi submit(), supaya
            // jawaban benar tidak bocor lewat API sebelum submit.
            $table->unsignedTinyInteger('correct_rank')->nullable();

            $table->timestamps();

            // Tepat 5 opsi per case_study, tepat 3 correct_rank (1/2/3) masing-
            // masing tepat satu, 2 sisanya null — divalidasi di aplikasi.
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_study_options');
    }
};