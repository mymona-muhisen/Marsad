<?php

namespace App\Services\Cases;

use App\Enums\CaseStatus;
use App\Exceptions\InvalidTransitionException;
use App\Models\AccidentCase;

/**
 * Doc 04 §2.3 / CLAUDE.md rule #2: the 12-state case lifecycle. The DB CHECK
 * only guards the value set; this map is the single source of truth for
 * which transitions are legal. Design (see DECISIONS.md, Sprint 3):
 *
 *  - draft -> submitted: citizen finishes the wizard.
 *  - submitted -> under_review: triage runs immediately on submission.
 *  - under_review -> awaiting_counterparty: a counterparty was invited.
 *  - under_review -> evidence_complete: no counterparty exists at all
 *    (declared hit-and-run) - nothing to wait on, skip the wait state.
 *  - awaiting_counterparty -> evidence_complete: counterparty joined, or
 *    the 24h one-sided timer fired (masar:flag-one-sided-cases).
 *  - evidence_complete -> adjudication -> decision_issued -> objection_window
 *    -> final -> closed: the fault/claims pipeline built in later sprints.
 *  - escalated: reachable from most active states for disputes/anomalies
 *    (disputed identity, forced authority attention, etc.) and resolves
 *    back into the flow or to cancelled.
 *  - cancelled / closed: terminal.
 */
class CaseLifecycleService
{
    /**
     * @var array<string, list<string>>
     */
    private const TRANSITIONS = [
        'draft' => ['submitted', 'cancelled'],
        'submitted' => ['under_review', 'cancelled'],
        'under_review' => ['awaiting_counterparty', 'evidence_complete', 'escalated', 'cancelled'],
        'awaiting_counterparty' => ['evidence_complete', 'escalated', 'cancelled'],
        'evidence_complete' => ['adjudication', 'escalated'],
        'adjudication' => ['decision_issued', 'escalated'],
        'decision_issued' => ['objection_window'],
        'objection_window' => ['final', 'escalated'],
        'final' => ['closed'],
        'closed' => [],
        'cancelled' => [],
        'escalated' => ['under_review', 'awaiting_counterparty', 'evidence_complete', 'cancelled'],
    ];

    public function transition(AccidentCase $case, CaseStatus $to): AccidentCase
    {
        $from = $case->status;

        if (! in_array($to->value, self::TRANSITIONS[$from->value], true)) {
            throw new InvalidTransitionException($from, $to);
        }

        $case->forceFill(['status' => $to])->save();

        return $case->refresh();
    }

    /**
     * Non-throwing check, for call sites that race with another trigger for
     * the same target status (Sprint 4: a dispatch completing and a
     * counterparty joining can both attempt evidence_complete — whichever
     * fires first should win silently, not throw on the other's attempt).
     */
    public function canTransition(AccidentCase $case, CaseStatus $to): bool
    {
        return in_array($to->value, self::TRANSITIONS[$case->status->value], true);
    }

    /**
     * @return list<string>
     */
    public function allowedTransitions(CaseStatus $from): array
    {
        return self::TRANSITIONS[$from->value];
    }
}
