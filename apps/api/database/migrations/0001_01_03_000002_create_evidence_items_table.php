<?php

use App\Enums\EvidenceType;
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
        Schema::create('evidence_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('accident_cases')->restrictOnDelete();
            $table->foreignId('party_id')->nullable()->constrained('case_parties')->restrictOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('type', 20);
            $table->string('file_path', 255);
            $table->char('sha256', 64);
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->dateTime('captured_at');
            $table->foreignId('superseded_by')->nullable()->constrained('evidence_items')->restrictOnDelete();
            $table->timestamps();

            $table->index('sha256');
        });

        DB::statement('ALTER TABLE evidence_items ADD CONSTRAINT chk_evidence_items_type CHECK ('.EnumCheck::in('type', EvidenceType::class).')');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evidence_items');
    }
};
