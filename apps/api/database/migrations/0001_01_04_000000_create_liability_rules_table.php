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
        Schema::create('liability_rules', function (Blueprint $table) {
            $table->id();
            $table->string('scenario_code', 30);
            $table->text('description_ar');
            $table->tinyInteger('fault_split_a')->unsigned();
            $table->tinyInteger('fault_split_b')->unsigned();
            $table->integer('version')->unsigned();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->unique(['scenario_code', 'version']);
        });

        DB::statement('ALTER TABLE liability_rules ADD CONSTRAINT chk_liability_rules_split CHECK (fault_split_a + fault_split_b = 100)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('liability_rules');
    }
};
