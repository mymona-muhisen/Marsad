<?php

use App\Enums\DispatchStatus;
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
        Schema::create('dispatches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('accident_cases')->restrictOnDelete();
            $table->foreignId('surveyor_id')->constrained('users')->restrictOnDelete();
            $table->string('zone', 80);
            $table->string('status', 20);
            $table->string('decline_reason', 255)->nullable();
            $table->timestamp('assigned_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['surveyor_id', 'status']);
        });

        DB::statement('ALTER TABLE dispatches ADD CONSTRAINT chk_dispatches_status CHECK ('.EnumCheck::in('status', DispatchStatus::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dispatches');
    }
};
