<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('google_id')->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->enum('role', ['user', 'admin'])->default('user');
            // Fase 3 — Foto Profil unggahan & Border SEKALA.
            // avatar_path: path file di disk hosting (BUKAN link Drive
            // seperti gambar CMS lain — ini upload asli, disimpan &
            // di-resize di server). Null = belum pernah upload, Flutter
            // fallback ke inisial/placeholder.
            $table->string('avatar_path')->nullable();
            // frame_unlocked_at: PERMANEN sekali terisi (diset saat user
            // sudah mengumpulkan semua badge dari year yang punya studi
            // kasus published) — tidak pernah dikosongkan lagi walau admin
            // menambah year baru dengan studi kasus baru, sama filosofi
            // sticky-nya dengan UserCaseStudyAttempt.completed_at.
            $table->timestamp('frame_unlocked_at')->nullable();
            // frame_equipped: toggle pasang/lepas border di foto profil,
            // hanya relevan kalau frame_unlocked_at sudah terisi.
            $table->boolean('frame_equipped')->default(false);
            // Status "sudah lihat tutorial onboarding" level AKUN (bukan
            // device) — pengganti flag SharedPreferences murni-lokal di
            // Flutter yang terbukti salah asumsi: SharedPreferences itu
            // per-device/per-install, bukan per-user, jadi logout lalu
            // daftar/login akun LAIN di device yang sama membuat tur
            // tidak pernah muncul untuk akun baru itu (ketuker sama akun
            // sebelumnya yang sudah pernah lihat). BEDA dari
            // `has_seen_wabah_intro` yang PERNAH dibuat lalu dihapus total
            // (lihat Schema.md) karena tidak pernah diekspos ke
            // UserResource/Flutter — kolom ini sengaja langsung
            // disambungkan ke UserResource & endpoint PATCH di PR yang
            // sama. Guest tetap pakai flag lokal SharedPreferences (guest
            // tidak punya row users).
            $table->boolean('has_seen_onboarding_tutorial')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};