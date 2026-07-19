<?php

namespace App\Enums;

/**
 * FR-CL2: "every decision carries a reason code." Doc 04/01 don't enumerate
 * a fixed code list, so this set was drafted to cover the four decide()
 * outcomes (see DECISIONS.md). Values are kept to <=20 chars to fit
 * claim_events.reason_code VARCHAR(20).
 */
enum ClaimReasonCode: string
{
    case FullyCovered = 'fully_covered';
    case PartialCoverageLimit = 'coverage_limit';
    case PartialDeviationAdjustment = 'deviation_adjusted';
    case PolicyLapsed = 'policy_lapsed';
    case DamageNotCovered = 'damage_not_covered';
    case FraudSuspected = 'fraud_suspected';
    case MissingDocuments = 'missing_documents';
    case EstimateClarificationNeeded = 'need_clarification';
}
