<?php

namespace App\Services\Cases;

use App\Enums\CaseStatus;
use App\Enums\DispatchStatus;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\Dispatch;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;

/**
 * FR-C5 / UC-03: zone-based surveyor assignment for dispatch_required cases.
 * "Nearest" is a pilot simplification — no real geo-distance routing yet
 * (config/zones.php), matched against a surveyor's home `users.zone`.
 */
class DispatchService
{
    public function __construct(
        private readonly CaseLifecycleService $lifecycle,
        private readonly EvidenceService $evidence,
    ) {}

    public function assign(AccidentCase $case): ?Dispatch
    {
        $excludeSurveyorIds = $case->dispatches()->pluck('surveyor_id')->all();

        $surveyor = $this->pickSurveyor($case->region, $excludeSurveyorIds);

        if (! $surveyor) {
            return null;
        }

        return Dispatch::create([
            'case_id' => $case->id,
            'surveyor_id' => $surveyor->id,
            'zone' => $surveyor->zone ?? $case->region ?? 'unassigned',
            'status' => DispatchStatus::Assigned,
            'assigned_at' => now(),
        ]);
    }

    public function accept(Dispatch $dispatch): Dispatch
    {
        $dispatch->forceFill([
            'status' => DispatchStatus::Accepted,
            'accepted_at' => now(),
        ])->save();

        return $dispatch->refresh();
    }

    /**
     * Decline triggers reassignment to the next available surveyor (doc 04:
     * "multiple dispatch rows per case are allowed ... full assignment
     * history is the accountability record; no overwriting").
     */
    public function decline(Dispatch $dispatch, string $reason): Dispatch
    {
        $dispatch->forceFill([
            'status' => DispatchStatus::Declined,
            'decline_reason' => $reason,
        ])->save();

        $this->assign($dispatch->case);

        return $dispatch->refresh();
    }

    public function markOnScene(Dispatch $dispatch): Dispatch
    {
        $dispatch->forceFill(['status' => DispatchStatus::OnScene])->save();

        return $dispatch->refresh();
    }

    /**
     * @param  list<UploadedFile>  $photos
     * @param  list<string|null>  $idempotencyKeys
     */
    public function complete(Dispatch $dispatch, User $surveyor, array $photos, array $idempotencyKeys): Dispatch
    {
        $case = $dispatch->case;

        $this->evidence->storePhotos(
            $case,
            null,
            $surveyor,
            $photos,
            (float) $case->lat,
            (float) $case->lng,
            $idempotencyKeys,
        );

        $dispatch->forceFill([
            'status' => DispatchStatus::Completed,
            'completed_at' => now(),
        ])->save();

        // Guarded, not unconditional: a counterparty joining independently
        // may have already moved the case to evidence_complete first.
        if ($this->lifecycle->canTransition($case, CaseStatus::EvidenceComplete)) {
            $this->lifecycle->transition($case, CaseStatus::EvidenceComplete);
        }

        return $dispatch->refresh();
    }

    /**
     * @return Builder<Dispatch>
     */
    public function forSurveyor(User $surveyor): Builder
    {
        return Dispatch::query()->where('surveyor_id', $surveyor->id);
    }

    /**
     * @param  list<int>  $excludeSurveyorIds
     */
    private function pickSurveyor(?string $zone, array $excludeSurveyorIds): ?User
    {
        $activeStatuses = [
            DispatchStatus::Assigned->value,
            DispatchStatus::Accepted->value,
            DispatchStatus::OnScene->value,
        ];

        $query = User::query()
            ->role(RoleName::Surveyor->value)
            ->when(! empty($excludeSurveyorIds), fn (Builder $q) => $q->whereNotIn('id', $excludeSurveyorIds))
            ->withCount(['dispatches as active_dispatches_count' => fn (Builder $q) => $q->whereIn('status', $activeStatuses)])
            ->orderBy('active_dispatches_count')
            ->orderBy('id');

        $surveyor = $zone !== null
            ? (clone $query)->where('zone', $zone)->first()
            : null;

        return $surveyor ?? $query->first();
    }
}
