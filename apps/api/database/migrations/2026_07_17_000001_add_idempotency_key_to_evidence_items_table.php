<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Implementation addition (Sprint 4, not in doc 04's original catalog —
     * see DECISIONS.md): the offline-tolerance contract for surveyor evidence
     * uploads — a client-generated UUID per file so retries don't duplicate.
     */
    public function up(): void
    {
        Schema::table('evidence_items', function (Blueprint $table) {
            $table->uuid('idempotency_key')->nullable()->after('sha256');
            $table->unique(['case_id', 'idempotency_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evidence_items', function (Blueprint $table) {
            $table->dropUnique(['case_id', 'idempotency_key']);
            $table->dropColumn('idempotency_key');
        });
    }
};
