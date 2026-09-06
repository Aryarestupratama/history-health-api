<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('sections')->cascadeOnDelete();
            $table->enum('type', ['text', 'image', 'video', 'pdf']);
            $table->text('content');

            // (Baru) Caption — OPSIONAL, relevan untuk tipe `image` & `video`
            // (sumber/keterangan media, mis. "Foto: Arsip Nasional RI, 1920").
            // Nullable & diabaikan (tidak ditampilkan) untuk tipe `text`/`pdf`.
            $table->string('caption')->nullable();

            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_blocks');
    }
};