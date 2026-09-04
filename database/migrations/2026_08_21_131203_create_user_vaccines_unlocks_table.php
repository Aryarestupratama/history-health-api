<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_vaccine_unlocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vaccine_id')->constrained('vaccines')->cascadeOnDelete();
            $table->timestamp('unlocked_at');
            // nullable: null = belum pernah dilihat user di halaman Koleksi
            // Vaksin (dipakai buat badge dot bottom nav & animasi reveal
            // locked->unlocked pertama kali), diisi begitu user membuka
            // detail/animasi vaksin tsb (lihat endpoint mark-seen).
            $table->timestamp('seen_at')->nullable();

            $table->unique(['user_id', 'vaccine_id']); // R-CARD-03 (idempotent, sama seperti sebelumnya)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_vaccine_unlocks');
    }
};