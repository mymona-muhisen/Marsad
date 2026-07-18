<?php

use App\Enums\ObjectionStatus;
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
        Schema::create('objections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('decision_id')->constrained('fault_decisions')->restrictOnDelete();
            $table->foreignId('party_id')->constrained('case_parties')->restrictOnDelete();
            $table->text('reason');
            $table->string('status', 20)->default(ObjectionStatus::Open->value);
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->text('resolution_note')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->timestamps();

            $table->unique(['decision_id', 'party_id']);
        });

        DB::statement('ALTER TABLE objections ADD CONSTRAINT chk_objections_status CHECK ('.EnumCheck::in('status', ObjectionStatus::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('objections');
    }
};
