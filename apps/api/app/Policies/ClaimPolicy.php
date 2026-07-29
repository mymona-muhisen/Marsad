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
        return $this->belongsToInsurer($user, $claim, [
            RoleName::InsurerAgent->value,
            RoleName::InsurerAdmin->value,
        ]);
    }

    /** Acting on a claim is the agent's alone — deciding, settling. */
    public function manage(User $user, Claim $claim): bool
    {
        return $this->belongsToInsurer($user, $claim, [RoleName::InsurerAgent->value]);
    }

    /**
     * @param  list<string>  $roles
     */
    private function belongsToInsurer(User $user, Claim $claim, array $roles): bool
    {
        return $user->hasAnyRole($roles) && $user->organization_id === $claim->insurer_org_id;
    }
}
