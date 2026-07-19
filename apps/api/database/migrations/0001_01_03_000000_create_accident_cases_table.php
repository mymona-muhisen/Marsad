<?php

use App\Enums\CaseChannel;
use App\Enums\CaseStatus;
use App\Enums\CaseTrack;
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
        Schema::create('accident_cases', function (Blueprint $table) {
            $table->id();
            $table->char('case_no', 12)->unique();
            $table->foreignId('reported_by')->constrained('users')->restrictOnDelete();
            $table->string('channel', 20);
            $table->string('status', 30)->default(CaseStatus::Draft->value);
            $table->string('track', 30)->nullable();
            $table->dateTime('occurred_at');
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->boolean('location_verified')->default(true);
            $table->string('region', 80)->nullable();
            $table->boolean('injury_flag')->default(false);
            $table->string('police_report_ref', 50)->nullable();
            $table->boolean('one_sided_flag')->default(false);
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['lat', 'lng']);
            $table->index('occurred_at');
            $table->index('region');
        });

        DB::statement('ALTER TABLE accident_cases ADD CONSTRAINT chk_accident_cases_channel CHECK ('.EnumCheck::in('channel', CaseChannel::class).')');
        DB::statement('ALTER TABLE accident_cases ADD CONSTRAINT chk_accident_cases_status CHECK ('.EnumCheck::in('status', CaseStatus::class).')');
        DB::statement('ALTER TABLE accident_cases ADD CONSTRAINT chk_accident_cases_track CHECK (track IS NULL OR ('.EnumCheck::in('track', CaseTrack::class).'))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accident_cases');
    }
};
