<?php

namespace App\Services\Fault;

use App\Enums\CaseStatus;
use App\Enums\FaultDecisionStatus;
use App\Models\FaultDecision;
use App\Services\Cases\CaseLifecycleService;

class ObjectionWindowService
{
    private const WINDOW_HOURS = 72;

    public function __construct(private readonly CaseLifecycleService $lifecycle) {}

    public function closeExpiredWindows(): int
    {
        $closed = 0;

        $decisions = FaultDecision::query()
            ->where('status', FaultDecisionStatus::Confirmed->value)
            ->where('decided_at', '<=', now()->subHours(self::WINDOW_HOURS))
            ->with('case')
            ->get();

        foreach ($decisions as $decision) {
            $decision->forceFill(['status' => FaultDecisionStatus::Final])->save();

            if ($this->lifecycle->canTransition($decision->case, CaseStatus::Final)) {
                $this->lifecycle->transition($decision->case, CaseStatus::Final);
            }

            $closed++;
        }

        return $closed;
    }
}
