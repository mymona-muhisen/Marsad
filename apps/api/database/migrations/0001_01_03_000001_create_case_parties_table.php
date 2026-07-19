<?php

use App\Enums\CasePartyRole;
use App\Support\EnumCheck;
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
        Schema::create('case_parties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('accident_cases')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained('vehicles')->restrictOnDelete();
            $table->foreignId('policy_id')->nullable()->constrained('insurance_policies')->restrictOnDelete();
            $table->string('role', 20);
            $table->string('unregistered_plate', 20)->nullable();
            $table->string('unregistered_phone', 20)->nullable();
            $table->text('statement_text')->nullable();
            $table->timestamp('joined_at')->nullable();
            // Implementation addition (Sprint 3, see DECISIONS.md): the
            // counterparty's signed, expiring deep-link join credential.
            $table->string('join_token', 64)->nullable()->unique();
            $table->timestamp('join_token_expires_at')->nullable();
            $table->timestamps();

            $table->unique(['case_id', 'role']);
        });

        DB::statement('ALTER TABLE case_parties ADD CONSTRAINT chk_case_parties_role CHECK ('.EnumCheck::in('role', CasePartyRole::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('case_parties');
    }
};
