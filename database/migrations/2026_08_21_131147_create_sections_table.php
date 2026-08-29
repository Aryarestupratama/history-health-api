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
            $table->string('title');
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