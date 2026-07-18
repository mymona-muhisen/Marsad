<?php

use App\Enums\SettlementMode;
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
        Schema::create('settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')->unique()->constrained('claims')->restrictOnDelete();
            $table->string('mode', 20);
            $table->decimal('amount', 14, 2);
            $table->foreignId('workshop_org_id')->nullable()->constrained('organizations')->restrictOnDelete();
            $table->dateTime('settled_at');
            $table->timestamps();
        });

        DB::statement('ALTER TABLE settlements ADD CONSTRAINT chk_settlements_mode CHECK ('.EnumCheck::in('mode', SettlementMode::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settlements');
    }
};
