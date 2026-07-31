<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Claim;
use App\Models\User;

class ClaimPolicy
{
    public function view(User $user, Claim $claim): bool
    {
        if ($user->id === $claim->claimantParty->user_id) {
            return true;
        }

        // Reading includes the insurer admin: doc 01 §B.4 gives that role an
        // SLA dashboard, which is a view over its own company's claims.
        if ($this->belongsToInsurer($user, $claim, [
            RoleName::InsurerAgent->value,
            RoleName::InsurerAdmin->value,
        ])) {
            return true;
        }

        // An assigned assessor has to read the claim it was asked to price.
        return $this->estimate($user, $claim);
    }

    /** Acting on a claim is the agent's alone — deciding, settling, assigning. */
    public function manage(User $user, Claim $claim): bool
    {
        return $this->belongsToInsurer($user, $claim, [RoleName::InsurerAgent->value]);
    }

    /**
     * Pricing the damage: only the office the insurer actually put on this
     * claim.
     *
     * Before `claims.assessor_org_id` existed there was nothing to check, so
     * `SubmitEstimateRequest::authorize()` returned a bare `true` and any
     * assessor could price any claim in the country.
     */
    public function estimate(User $user, Claim $claim): bool
    {
        if ($claim->assessor_org_id === null || $user->organization_id === null) {
            return false;
        }

        return $user->hasAnyRole([
            RoleName::Assessor->value,
            RoleName::Workshop->value,
        ]) && $user->organization_id === $claim->assessor_org_id;
    }

    /**
     * @param  list<string>  $roles
     */
    private function belongsToInsurer(User $user, Claim $claim, array $roles): bool
    {
        return $user->hasAnyRole($roles) && $user->organization_id === $claim->insurer_org_id;
    }
}
