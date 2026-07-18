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

        return $user->hasRole(RoleName::InsurerAgent->value) && $user->organization_id === $claim->insurer_org_id;
    }

    public function manage(User $user, Claim $claim): bool
    {
        return $user->hasRole(RoleName::InsurerAgent->value) && $user->organization_id === $claim->insurer_org_id;
    }
}
