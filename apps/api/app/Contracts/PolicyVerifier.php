<?php

namespace App\Contracts;

use App\Models\InsurancePolicy;
use App\Models\User;

interface PolicyVerifier
{
    /**
     * Mark the policy as verified.
     */
    public function verify(InsurancePolicy $policy, User $verifier): void;

    /**
     * Mark the policy as rejected.
     */
    public function reject(InsurancePolicy $policy, User $verifier, ?string $reason): void;
}
