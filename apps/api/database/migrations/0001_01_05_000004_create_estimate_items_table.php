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
        Schema::create('estimate_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estimate_id')->constrained('damage_estimates')->cascadeOnDelete();
            $table->foreignId('part_price_id')->nullable()->constrained('parts_prices')->restrictOnDelete();
            $table->string('description', 150);
            $table->smallInteger('qty')->unsigned();
            $table->decimal('unit_price', 12, 2);
            $table->decimal('labor_hours', 5, 2)->nullable();
            $table->decimal('line_total', 14, 2);
            $table->boolean('deviation_flag')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('estimate_items');
    }
};
