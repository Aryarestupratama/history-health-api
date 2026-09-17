<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('year_summary_point_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('year_summary_point_id')->constrained('year_summary_points')->cascadeOnDelete();
            $table->string('option_text'); // is_correct=true -> kalimat rangkuman asli; is_correct=false -> kalimat pengecoh mirip
            $table->boolean('is_correct')->default(false);
            $table->integer('order')->default(0); // urutan input admin; urutan tampil ke user diacak on-the-fly di response
            $table->timestamps();

            // Tepat 3 opsi per poin, tepat 1 is_correct=true — divalidasi di aplikasi, bukan constraint DB.
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('year_summary_point_options');
    }
};