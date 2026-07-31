<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which assessor office or workshop the insurer put on this claim.
 *
 * Doc 01 §B.3 stage 6 has the insurer choosing between an accredited assessor
 * visit, a workshop-submitted estimate, or a desk assessment — but no column
 * ever recorded that choice. The consequence was that
 * `SubmitEstimateRequest::authorize()` could only return true: with nothing to
 * check against, any assessor in the country could price any claim.
 *
 * Nullable because a desk assessment by the insurer's own staff assigns nobody,
 * and because claims opened before this migration have no assignment.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->foreignId('assessor_org_id')
                ->nullable()
                ->after('insurer_org_id')
                ->constrained('organizations')
                ->restrictOnDelete();

            $table->index(['assessor_org_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->dropIndex(['assessor_org_id', 'status']);
            $table->dropConstrainedForeignId('assessor_org_id');
        });
    }
};
