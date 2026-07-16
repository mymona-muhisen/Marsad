<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->restrictOnDelete();
            $table->string('plate_no', 20)->unique();
            $table->string('vin', 30)->nullable()->unique();
            $table->string('make', 50);
            $table->string('model', 50);
            $table->smallInteger('year')->unsigned()->nullable();
            $table->string('color', 30)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        DB::statement('ALTER TABLE vehicles ADD CONSTRAINT chk_vehicles_year CHECK (year IS NULL OR (year BETWEEN 1950 AND 2030))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
