<?php

namespace App\Enums;

/**
 * The 12-state case lifecycle (doc 04 §2.3, FR-C4). The DB CHECK constraint
 * only guards the value set — legal transitions are enforced in
 * CaseLifecycleService's transition map, never at the database layer.
 */
enum CaseStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case AwaitingCounterparty = 'awaiting_counterparty';
    case EvidenceComplete = 'evidence_complete';
    case Adjudication = 'adjudication';
    case DecisionIssued = 'decision_issued';
    case ObjectionWindow = 'objection_window';
    case Final = 'final';
    case Closed = 'closed';
    case Cancelled = 'cancelled';
    case Escalated = 'escalated';
}
