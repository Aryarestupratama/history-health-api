<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccines', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('photo')->nullable(); // link Google Drive, pola sama seperti figures.photo sebelumnya
            $table->string('manufacturer')->nullable(); // produsen/penemu vaksin
            $table->string('disease_target')->nullable(); // penyakit/wabah yang ditargetkan
            $table->integer('year_introduced')->nullable(); // tahun vaksin ditemukan/diperkenalkan
            $table->text('description'); // deskripsi/fungsi vaksin, pengganti role_description
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccines');
    }
};