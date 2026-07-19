<?php

use App\Enums\AccountStatus;
use App\Enums\Locale;
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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('full_name', 120);
            $table->string('phone', 20)->unique();
            $table->string('email', 120)->nullable()->unique();
            $table->string('national_id', 20)->nullable()->unique();
            $table->string('password');
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->restrictOnDelete();
            $table->char('locale', 2)->default(Locale::Arabic->value);
            $table->string('status', 20)->default(AccountStatus::Active->value);
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamps();
        });

        DB::statement('ALTER TABLE users ADD CONSTRAINT chk_users_locale CHECK ('.EnumCheck::in('locale', Locale::class).')');
        DB::statement('ALTER TABLE users ADD CONSTRAINT chk_users_status CHECK ('.EnumCheck::in('status', AccountStatus::class).')');

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
