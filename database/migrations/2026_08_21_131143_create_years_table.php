<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('era_id')->constrained('eras')->cascadeOnDelete();
            $table->integer('year');
            $table->string('title');
            $table->text('summary')->nullable(); // rangkuman wabah, pindah dari content_blocks (per section) ke sini (per wabah) — R-CMS-03/04 lama dihapus
            $table->timestamps();

            // Kombinasi era_id + year unique, sesuai catatan Schema.md
            // (hapus baris ini kalau ternyata 1 tahun bisa punya >1 wabah berbeda)
            $table->unique(['era_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('years');
    }
};