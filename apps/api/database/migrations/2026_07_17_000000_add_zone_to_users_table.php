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
     * see DECISIONS.md): a surveyor's home zone for dispatch assignment.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('zone', 80)->nullable()->after('organization_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('zone');
        });
    }
};
