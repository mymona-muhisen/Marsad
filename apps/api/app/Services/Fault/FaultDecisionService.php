<?php

namespace App\Services\Fault;

use App\Enums\CaseStatus;
use App\Enums\FaultDecisionStatus;
use App\Jobs\GenerateFaultReport;
use App\Models\AccidentCase;
use App\Models\FaultAllocation;
use App\Models\FaultDecision;
use App\Models\LiabilityRule;
use App\Models\User;
use App\Services\Cases\CaseLifecycleService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * UC-04: the adjudicator's single decision act. "proposed" (system preview
 * of a rule's default split before confirmation) is a valid schema state
 * but isn't surfaced as its own endpoint in this sprint — decide() both
 * proposes and confirms in one call. See DECISIONS.md.
 */
class FaultDecisionService
{
    public function __construct(private readonly CaseLifecycleService $lifecycle) {}

    /**
     * FIFO adjudication queue: evidence_complete cases with no decision yet.
     *
     * @return Builder<AccidentCase>
     */
    public function queue(): Builder
    {
        return AccidentCase::query()
            ->where('status', CaseStatus::EvidenceComplete->value)
            ->whereDoesntHave('faultDecision')
            ->orderBy('created_at');
    }

    /**
     * @param  list<array{party_id: int, percentage: int}>  $allocations
     */
    public function decide(AccidentCase $case, User $adjudicator, ?string $scenarioCode, array $allocations, ?string $justification): FaultDecision
    {
        if (FaultDecision::where('case_id', $case->id)->exists()) {
            throw ValidationException::withMessages([
                'case' => ['تم اتخاذ قرار مسبق لهذا الملف.'],
            ]);
        }

        $this->assertAllocationsSumTo100($allocations);

        $rule = $scenarioCode !== null ? $this->currentRule($scenarioCode) : null;
        $wasOverridden = $rule === null || ! $this->matchesRuleSplit($rule, $allocations);

        if ($wasOverridden && ! $justification) {
            throw ValidationException::withMessages([
                'justification' => ['التبرير مطلوب عند التعديل على الاقتراح أو عند اختيار MANUAL.'],
            ]);
        }

        $decision = DB::transaction(function () use ($case, $adjudicator, $rule, $wasOverridden, $justification, $allocations) {
            $decision = FaultDecision::create([
                'case_id' => $case->id,
                'rule_id' => $rule?->id,
                'adjudicator_id' => $adjudicator->id,
                'status' => FaultDecisionStatus::Confirmed,
                'was_overridden' => $wasOverridden,
                'justification' => $justification,
                'decided_at' => now(),
            ]);

            foreach ($allocations as $allocation) {
                FaultAllocation::create([
                    'decision_id' => $decision->id,
                    'party_id' => $allocation['party_id'],
                    'percentage' => $allocation['percentage'],
                ]);
            }

            $this->lifecycle->transition($case, CaseStatus::Adjudication);
            $this->lifecycle->transition($case, CaseStatus::DecisionIssued);

            return $decision;
        });

        GenerateFaultReport::dispatch($case->id);

        $this->lifecycle->transition($case->refresh(), CaseStatus::ObjectionWindow);

        return $decision;
    }

    /**
     * @param  list<array{party_id: int, percentage: int}>  $allocations
     */
    public function assertAllocationsSumTo100(array $allocations): void
    {
        $sum = array_sum(array_column($allocations, 'percentage'));

        if ($sum !== 100) {
            throw ValidationException::withMessages([
                'allocations' => ["مجموع النسب يجب أن يساوي 100 (المجموع الحالي: {$sum})."],
            ]);
        }
    }

    private function currentRule(string $scenarioCode): LiabilityRule
    {
        return LiabilityRule::query()
            ->where('scenario_code', $scenarioCode)
            ->whereNull('effective_to')
            ->latest('version')
            ->firstOrFail();
    }

    /**
     * @param  list<array{party_id: int, percentage: int}>  $allocations
     */
    private function matchesRuleSplit(LiabilityRule $rule, array $allocations): bool
    {
        $submitted = collect($allocations)->pluck('percentage')->sort()->values()->all();
        $default = collect([$rule->fault_split_a, $rule->fault_split_b])->sort()->values()->all();

        return $submitted === $default;
    }
}
