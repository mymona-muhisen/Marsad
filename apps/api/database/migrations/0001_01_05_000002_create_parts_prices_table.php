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
        Schema::create('parts_prices', function (Blueprint $table) {
            $table->id();
            $table->string('part_code', 30);
            $table->string('name_ar', 120);
            $table->decimal('reference_price', 12, 2);
            $table->integer('version')->unsigned();
            $table->date('effective_from');
            $table->timestamps();

            $table->unique(['part_code', 'version']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parts_prices');
    }
};
