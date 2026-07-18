<?php

use App\Enums\ReportStatus;
use App\Support\EnumCheck;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Deviation from doc 04's literal `case_id UQ` (see DECISIONS.md,
     * Sprint 5): a plain index instead, so an appeal amendment can insert a
     * new report row that supersedes the old one — the UQ as written would
     * make the documented supersede chain impossible to ever populate.
     * "At most one ACTIVE report per case" is a service-layer invariant.
     */
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('accident_cases')->restrictOnDelete();
            $table->char('report_no', 14)->unique();
            $table->string('pdf_path', 255);
            $table->char('qr_token', 36)->unique();
            $table->char('signed_hash', 64);
            $table->string('status', 20)->default(ReportStatus::Active->value);
            $table->foreignId('superseded_by')->nullable()->constrained('reports')->restrictOnDelete();
            $table->dateTime('issued_at');
            $table->timestamps();

            $table->index('case_id');
        });

        DB::statement('ALTER TABLE reports ADD CONSTRAINT chk_reports_status CHECK ('.EnumCheck::in('status', ReportStatus::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
