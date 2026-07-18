<?php

use App\Enums\ClaimStatus;
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
        Schema::create('claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('accident_cases')->restrictOnDelete();
            $table->foreignId('claimant_party_id')->constrained('case_parties')->restrictOnDelete();
            $table->foreignId('insurer_org_id')->constrained('organizations')->restrictOnDelete();
            $table->string('status', 30)->default(ClaimStatus::Opened->value);
            $table->dateTime('sla_due_at');
            $table->timestamps();

            $table->unique(['case_id', 'claimant_party_id']);
            $table->index(['insurer_org_id', 'status']);
            $table->index('sla_due_at');
        });

        DB::statement('ALTER TABLE claims ADD CONSTRAINT chk_claims_status CHECK ('.EnumCheck::in('status', ClaimStatus::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('claims');
    }
};
