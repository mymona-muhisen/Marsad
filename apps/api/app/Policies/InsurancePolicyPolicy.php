<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\InsurancePolicy;
use App\Models\User;

class InsurancePolicyPolicy
{
    public function view(User $user, InsurancePolicy $policy): bool
    {
        return $user->id === $policy->vehicle->owner_id;
    }

    public function verify(User $user, InsurancePolicy $policy): bool
    {
        return $user->hasRole(RoleName::InsurerAgent->value)
            && $user->organization_id === $policy->insurer_org_id;
    }

    public function reject(User $user, InsurancePolicy $policy): bool
    {
        return $this->verify($user, $policy);
    }
}
