<?php

namespace App\Services\Claims;

use App\Models\Claim;
use App\Models\Organization;
use App\Models\User;

class AssessorAssignmentService
{
    public function __construct(private readonly ClaimTimelineService $timeline) {}

    /**
     * Put an assessor office or workshop on a claim, or clear it.
     *
     * Recorded on the claim timeline rather than only overwriting the column:
     * `claims.assessor_org_id` holds the current assignment, and the history of
     * who was asked and when lives in `claim_events` (doc 04 §2.5 — "status
     * alone loses history").
     */
    public function assign(Claim $claim, User $agent, ?int $assessorOrgId): Claim
    {
        $claim->forceFill(['assessor_org_id' => $assessorOrgId])->save();

        $note = $assessorOrgId === null
            ? null
            : Organization::query()->whereKey($assessorOrgId)->value('name_ar');

        $this->timeline->log(
            $claim,
            $agent,
            $assessorOrgId === null ? 'assessor_cleared' : 'assessor_assigned',
            null,
            $note,
        );

        return $claim->refresh();
    }
}
