<?php

namespace App\Services\Policy;

use App\Contracts\PolicyVerifier;
use App\Enums\VerificationStatus;
use App\Models\InsurancePolicy;
use App\Models\User;

/**
 * Dev/manual-mode adapter (CLAUDE.md rule #4): an insurer_agent decides
 * verify/reject in the back-office queue. A future ApiPolicyVerifier can
 * call the insurer's own verification API behind the same interface.
 */
class ManualPolicyVerifier implements PolicyVerifier
{
    public function verify(InsurancePolicy $policy, User $verifier): void
    {
        $policy->forceFill([
            'verification_status' => VerificationStatus::Verified,
            'verified_by' => $verifier->id,
            'verified_at' => now(),
        ])->save();
    }

    public function reject(InsurancePolicy $policy, User $verifier, ?string $reason): void
    {
        $policy->forceFill([
            'verification_status' => VerificationStatus::Rejected,
            'verified_by' => $verifier->id,
            'verified_at' => now(),
        ])->save();
    }
}
