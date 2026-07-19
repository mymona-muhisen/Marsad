<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Deviation from doc 04 (see DECISIONS.md, Sprint 6): `actor_id` is
     * nullable here, not NOT NULL as originally written. Some events are
     * genuinely system-generated (claim auto-open on case finalization,
     * scheduled SLA-breach flagging) with no human actor to attribute them
     * to — forcing a human FK there would misrepresent the audit trail,
     * not strengthen it.
     */
    public function up(): void
    {
        Schema::create('claim_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')->constrained('claims')->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('action', 40);
            $table->string('reason_code', 20)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['claim_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('claim_events');
    }
};
