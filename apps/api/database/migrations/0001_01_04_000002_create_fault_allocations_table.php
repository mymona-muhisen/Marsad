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
        Schema::create('fault_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('decision_id')->constrained('fault_decisions')->cascadeOnDelete();
            $table->foreignId('party_id')->constrained('case_parties')->restrictOnDelete();
            $table->tinyInteger('percentage')->unsigned();
            $table->timestamps();

            $table->unique(['decision_id', 'party_id']);
        });

        DB::statement('ALTER TABLE fault_allocations ADD CONSTRAINT chk_fault_allocations_percentage CHECK (percentage BETWEEN 0 AND 100)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fault_allocations');
    }
};
