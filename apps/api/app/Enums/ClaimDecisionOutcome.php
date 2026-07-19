<?php

namespace App\Enums;

/**
 * The insurer agent's decide() outcome (FR-CL2) — distinct from the
 * persisted `claims.status` (ClaimStatus), which decide() maps onto.
 */
enum ClaimDecisionOutcome: string
{
    case Approve = 'approve';
    case Partial = 'partial';
    case Reject = 'reject';
    case RequestInfo = 'request_info';

    public function claimStatus(): ClaimStatus
    {
        return match ($this) {
            self::Approve => ClaimStatus::Approved,
            self::Partial => ClaimStatus::PartiallyApproved,
            self::Reject => ClaimStatus::Rejected,
            self::RequestInfo => ClaimStatus::InfoRequested,
        };
    }
}
