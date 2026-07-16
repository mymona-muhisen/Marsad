<?php

use App\Enums\PolicyType;
use App\Enums\VerificationStatus;
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
        Schema::create('insurance_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained('vehicles')->restrictOnDelete();
            $table->foreignId('insurer_org_id')->constrained('organizations')->restrictOnDelete();
            $table->string('policy_no', 50);
            $table->string('type', 30);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('verification_status', 20)->default(VerificationStatus::Unverified->value);
            $table->foreignId('verified_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->string('document_path')->nullable();
            $table->timestamps();

            $table->unique(['insurer_org_id', 'policy_no']);
            $table->index(['vehicle_id', 'end_date']);
        });

        DB::statement('ALTER TABLE insurance_policies ADD CONSTRAINT chk_insurance_policies_type CHECK ('.EnumCheck::in('type', PolicyType::class).')');
        DB::statement('ALTER TABLE insurance_policies ADD CONSTRAINT chk_insurance_policies_verification_status CHECK ('.EnumCheck::in('verification_status', VerificationStatus::class).')');
        DB::statement('ALTER TABLE insurance_policies ADD CONSTRAINT chk_insurance_policies_dates CHECK (end_date > start_date)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('insurance_policies');
    }
};
