<?php

use App\Enums\DamageEstimateStatus;
use App\Enums\DamageEstimateType;
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
        Schema::create('damage_estimates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')->constrained('claims')->restrictOnDelete();
            $table->foreignId('submitted_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('org_id')->nullable()->constrained('organizations')->restrictOnDelete();
            $table->string('type', 20);
            $table->string('status', 20)->default(DamageEstimateStatus::Draft->value);
            $table->decimal('total', 14, 2);
            $table->timestamps();
        });

        DB::statement('ALTER TABLE damage_estimates ADD CONSTRAINT chk_damage_estimates_type CHECK ('.EnumCheck::in('type', DamageEstimateType::class).')');
        DB::statement('ALTER TABLE damage_estimates ADD CONSTRAINT chk_damage_estimates_status CHECK ('.EnumCheck::in('status', DamageEstimateStatus::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('damage_estimates');
    }
};
