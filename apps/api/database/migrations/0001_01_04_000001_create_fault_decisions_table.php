<?php

use App\Enums\FaultDecisionStatus;
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
        Schema::create('fault_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->unique()->constrained('accident_cases')->restrictOnDelete();
            $table->foreignId('rule_id')->nullable()->constrained('liability_rules')->restrictOnDelete();
            $table->foreignId('adjudicator_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 20);
            $table->boolean('was_overridden')->default(false);
            $table->text('justification')->nullable();
            $table->dateTime('decided_at');
            $table->timestamps();
        });

        DB::statement('ALTER TABLE fault_decisions ADD CONSTRAINT chk_fault_decisions_status CHECK ('.EnumCheck::in('status', FaultDecisionStatus::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fault_decisions');
    }
};
