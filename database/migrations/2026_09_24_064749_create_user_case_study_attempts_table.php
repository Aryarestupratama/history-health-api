<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_case_study_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('case_study_id')->constrained('case_studies')->cascadeOnDelete();

            // 3 slot prioritas (1/2/3) diisi user, refer ke case_study_options
            // milik case_study yang sama. restrictOnDelete (bukan cascade)
            // supaya opsi tidak bisa dihapus admin selama masih direferensikan
            // attempt user — beda dari pola FK lain di skema ini yang umumnya
            // cascade, sengaja dijaga karena ini "hasil" user, bukan konten murni.
            $table->foreignId('slot_1_option_id')->constrained('case_study_options')->restrictOnDelete();
            $table->foreignId('slot_2_option_id')->constrained('case_study_options')->restrictOnDelete();
            $table->foreignId('slot_3_option_id')->constrained('case_study_options')->restrictOnDelete();

            // Alasan/analisis singkat user (min. karakter divalidasi di
            // aplikasi — usul ±30, lihat "Detail yang masih terbuka" di
            // progress.md). Disimpan per attempt TAPI sengaja TIDAK ada
            // endpoint/tampilan admin untuk membacanya (keputusan produk).
            $table->text('reason');

            // NULLABLE (beda dari completed_at di user_year_summary_completions
            // yang selalu terisi) — hanya diisi saat hasil submit BENAR (ketiga
            // slot tepat & urutannya persis correct_rank). PENTING: begitu
            // terisi, TIDAK PERNAH di-null-kan lagi walau user retake & salah
            // di percobaan berikutnya — badge yang sudah didapat harus aman
            // permanen (lihat UserCaseStudyAttempt::recordAttempt()).
            $table->timestamp('completed_at')->nullable();

            // Dot merah / tag "Baru" (badge belum dilihat) — mirror
            // `user_vaccine_unlocks.seen_at`. Independen dari completed_at:
            // begitu completed_at terisi, seen_at TETAP null sampai user
            // beneran membuka Koleksi Badge (endpoint mark-seen), supaya ada
            // jeda "dot menyala" antara badge didapat dan dilihat. Sekali
            // terisi, permanen sama seperti completed_at — recordAttempt()
            // di bawah TIDAK menyentuh kolom ini sama sekali.
            $table->timestamp('seen_at')->nullable();

            $table->timestamps();

            // Retake (benar maupun salah) MENIMPA row yang sama, bukan bikin
            // riwayat baru — filosofi sama dengan user_year_summary_completions
            // / user_era_quiz_attempts. Draft di tengah pengerjaan (belum klik
            // Submit) tidak pernah sampai ke tabel ini sama sekali.
            $table->unique(['user_id', 'case_study_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_case_study_attempts');
    }
};