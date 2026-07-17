<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Implementation addition (Sprint 3, not in doc 04's original catalog —
     * see DECISIONS.md): the duplicate-photo fraud net (CLAUDE.md rule #3).
     */
    public function up(): void
    {
        Schema::create('fraud_flags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('accident_cases')->restrictOnDelete();
            $table->foreignId('evidence_item_id')->constrained('evidence_items')->restrictOnDelete();
            $table->foreignId('matched_evidence_item_id')->constrained('evidence_items')->restrictOnDelete();
            $table->string('reason', 50);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['case_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fraud_flags');
    }
};
