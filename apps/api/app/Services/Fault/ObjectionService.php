<?php

namespace App\Services\Fault;

use App\Enums\CaseStatus;
use App\Enums\FaultDecisionStatus;
use App\Enums\ObjectionStatus;
use App\Jobs\GenerateFaultReport;
use App\Models\FaultAllocation;
use App\Models\FaultDecision;
use App\Models\Objection;
use App\Models\User;
use App\Services\Cases\CaseLifecycleService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * FR-F3: 72h objection window, one appeal level, senior adjudicator
 * resolves. Upholding amends the single fault_decisions row in place
 * (doc 04 keeps a strict 1:1 case<->decision) and regenerates the report,
 * which supersedes the one already issued at decision_issued time.
 */
class ObjectionService
{
    private const WINDOW_HOURS = 72;

    public function __construct(private readonly CaseLifecycleService $lifecycle) {}

    public function submit(FaultDecision $decision, User $user, string $reason): Objection
    {
        $party = $decision->case->parties()->where('user_id', $user->id)->first();

        if (! $party) {
            throw ValidationException::withMessages([
                'reason' => ['أنت لست طرفاً في هذا الملف.'],
            ]);
        }

        if ($decision->decided_at->addHours(self::WINDOW_HOURS)->isPast()) {
            throw ValidationException::withMessages([
                'reason' => ['انتهت مهلة الاعتراض (72 ساعة).'],
            ]);
        }

        if (Objection::where('decision_id', $decision->id)->where('party_id', $party->id)->exists()) {
            throw ValidationException::withMessages([
                'reason' => ['تم تقديم اعتراض مسبقاً من هذا الطرف.'],
            ]);
        }

        $objection = Objection::create([
            'decision_id' => $decision->id,
            'party_id' => $party->id,
            'reason' => $reason,
            'status' => ObjectionStatus::Open,
        ]);

        $decision->forceFill(['status' => FaultDecisionStatus::Objected])->save();

        return $objection;
    }

    /**
     * @param  list<array{party_id: int, percentage: int}>|null  $amendedAllocations
     */
    public function resolve(Objection $objection, User $reviewer, string $outcome, string $resolutionNote, ?array $amendedAllocations): Objection
    {
        $decision = $objection->decision;
        $case = $decision->case;
        $upheld = $outcome === 'uphold';

        if ($upheld) {
            $this->amendDecision($decision, $reviewer, $resolutionNote, $amendedAllocations);
        }

        $objection->forceFill([
            'status' => $upheld ? ObjectionStatus::Upheld : ObjectionStatus::Dismissed,
            'reviewed_by' => $reviewer->id,
            'resolution_note' => $resolutionNote,
            'resolved_at' => now(),
        ])->save();

        $decision->forceFill(['status' => FaultDecisionStatus::Final])->save();
        $this->lifecycle->transition($case, CaseStatus::Final);

        if ($upheld) {
            GenerateFaultReport::dispatch($case->id);
        }

        return $objection->refresh();
    }

    /**
     * @param  list<array{party_id: int, percentage: int}>|null  $amendedAllocations
     */
    private function amendDecision(FaultDecision $decision, User $reviewer, string $resolutionNote, ?array $amendedAllocations): void
    {
        if ($amendedAllocations === null) {
            throw ValidationException::withMessages([
                'amended_allocations' => ['يجب تقديم توزيع نسب معدل عند قبول الاعتراض.'],
            ]);
        }

        $sum = array_sum(array_column($amendedAllocations, 'percentage'));

        if ($sum !== 100) {
            throw ValidationException::withMessages([
                'amended_allocations' => ["مجموع النسب يجب أن يساوي 100 (المجموع الحالي: {$sum})."],
            ]);
        }

        DB::transaction(function () use ($decision, $amendedAllocations, $resolutionNote) {
            FaultAllocation::where('decision_id', $decision->id)->delete();

            foreach ($amendedAllocations as $allocation) {
                FaultAllocation::create([
                    'decision_id' => $decision->id,
                    'party_id' => $allocation['party_id'],
                    'percentage' => $allocation['percentage'],
                ]);
            }

            $decision->forceFill([
                'was_overridden' => true,
                'justification' => trim($decision->justification."\n\n[تعديل بعد الاعتراض]: ".$resolutionNote),
            ])->save();
        });
    }
}
