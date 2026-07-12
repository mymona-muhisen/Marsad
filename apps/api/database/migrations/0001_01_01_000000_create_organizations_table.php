<?php

use App\Enums\AccountStatus;
use App\Enums\OrganizationType;
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
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name_ar', 150);
            $table->string('name_en', 150)->nullable();
            $table->string('type', 30);
            $table->string('license_no', 50)->nullable();
            $table->string('status', 20)->default(AccountStatus::Active->value);
            $table->timestamps();

            $table->unique(['type', 'license_no']);
        });

        DB::statement('ALTER TABLE organizations ADD CONSTRAINT chk_organizations_type CHECK ('.EnumCheck::in('type', OrganizationType::class).')');
        DB::statement('ALTER TABLE organizations ADD CONSTRAINT chk_organizations_status CHECK ('.EnumCheck::in('status', AccountStatus::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
