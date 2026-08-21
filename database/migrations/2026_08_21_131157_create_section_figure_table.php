<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('section_figure', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('sections')->cascadeOnDelete();
            $table->foreignId('figure_id')->constrained('figures')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['section_id', 'figure_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('section_figure');
    }
};