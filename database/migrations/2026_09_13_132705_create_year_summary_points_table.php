<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('year_summary_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('year_summary_id')->constrained('year_summaries')->cascadeOnDelete();
            $table->integer('order')->default(0); // urutan tampil poin (1-7)
            $table->timestamps();

            // Tepat 7 poin per year_summaries — divalidasi di aplikasi, bukan constraint DB.
            $table->unique(['year_summary_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('year_summary_points');
    }
};