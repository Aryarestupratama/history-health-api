<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_card_unlocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('figure_id')->constrained('figures')->cascadeOnDelete();
            $table->timestamp('unlocked_at');

            $table->unique(['user_id', 'figure_id']); // R-CARD-03
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_card_unlocks');
    }
};