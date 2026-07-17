<?php

namespace App\Services\Cases;

use App\Contracts\SmsGateway;
use App\Enums\CaseChannel;
use App\Enums\CasePartyRole;
use App\Enums\CaseStatus;
use App\Enums\CaseTrack;
use App\Enums\EvidenceType;
use App\Enums\VerificationStatus;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CaseService
{
    public function __construct(
        private readonly CaseLifecycleService $lifecycle,
        private readonly TriageService $triage,
        private readonly EvidenceService $evidence,
        private readonly DispatchService $dispatch,
        private readonly SmsGateway $smsGateway,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $photos
     */
    public function createFromReport(User $reporter, array $data, array $photos, ?UploadedFile $voiceStatement): AccidentCase
    {
        $reporterVehicle = Vehicle::findOrFail($data['vehicle_id']);

        $case = AccidentCase::create([
            'case_no' => $this->generateCaseNo(),
            'reported_by' => $reporter->id,
            'channel' => CaseChannel::Self,
            'status' => CaseStatus::Draft,
            'occurred_at' => $data['occurred_at'],
            'lat' => $data['lat'],
            'lng' => $data['lng'],
            'location_verified' => $data['location_verified'] ?? true,
            'injury_flag' => $data['injury_flag'] ?? false,
        ]);

        $reporterParty = CaseParty::create([
            'case_id' => $case->id,
            'user_id' => $reporter->id,
            'vehicle_id' => $reporterVehicle->id,
            'policy_id' => $this->activePolicyId($reporterVehicle),
            'role' => CasePartyRole::Reporter,
            'statement_text' => $data['statement'] ?? null,
        ]);

        $this->evidence->storePhotos($case, $reporterParty, $reporter, $photos, (float) $case->lat, (float) $case->lng);

        if ($voiceStatement) {
            $this->evidence->storeOne($case, $reporterParty, $reporter, EvidenceType::Voice, $voiceStatement, (float) $case->lat, (float) $case->lng);
        }

        $hitAndRun = (bool) ($data['hit_and_run'] ?? false);
        $counterpartyVehicle = ! empty($data['counterparty_vehicle_id'])
            ? Vehicle::find($data['counterparty_vehicle_id'])
            : null;

        $counterpartyPolicyId = $counterpartyVehicle ? $this->activePolicyId($counterpartyVehicle) : null;
        $uninsuredParty = ! $hitAndRun && $counterpartyPolicyId === null;

        $track = $this->triage->classify([
            'injury_flag' => (bool) ($data['injury_flag'] ?? false),
            'hit_and_run' => $hitAndRun,
            'uninsured_party' => $uninsuredParty,
        ]);

        $case->forceFill(['track' => $track])->save();

        $this->lifecycle->transition($case, CaseStatus::Submitted);
        $this->lifecycle->transition($case, CaseStatus::UnderReview);

        if ($hitAndRun) {
            CaseParty::create([
                'case_id' => $case->id,
                'role' => CasePartyRole::Counterparty,
                'unregistered_plate' => $data['counterparty_plate'] ?? null,
            ]);

            $case->forceFill(['one_sided_flag' => true])->save();
        } else {
            $token = Str::random(64);
            $phone = $data['counterparty_phone'] ?? $counterpartyVehicle?->owner?->phone;

            CaseParty::create([
                'case_id' => $case->id,
                'user_id' => $counterpartyVehicle?->owner_id,
                'vehicle_id' => $counterpartyVehicle?->id,
                'policy_id' => $counterpartyPolicyId,
                'role' => CasePartyRole::Counterparty,
                'unregistered_plate' => $data['counterparty_plate'] ?? null,
                'unregistered_phone' => $phone,
                'join_token' => $token,
                'join_token_expires_at' => now()->addHours(24),
            ]);

            $this->lifecycle->transition($case, CaseStatus::AwaitingCounterparty);

            $this->smsGateway->send(
                $phone,
                "تم تسجيلك كطرف في حادث مروري رقم {$case->case_no}. لإكمال بيانك: ".config('app.url')."/join/{$token}",
            );
        }

        if ($track === CaseTrack::DispatchRequired) {
            // The surveyor's on-scene -> completed transition (Sprint 4) is
            // what ultimately reaches evidence_complete for this track — not
            // this immediate creation call. See DECISIONS.md.
            $this->dispatch->assign($case->refresh());
        } elseif ($hitAndRun && $this->lifecycle->canTransition($case, CaseStatus::EvidenceComplete)) {
            // Only reachable here when hit-and-run already resolved the
            // counterparty side (one_sided_flag) — a freshly-created,
            // not-yet-joined counterparty invite must never be skipped.
            $this->lifecycle->transition($case, CaseStatus::EvidenceComplete);
        }

        return $case->refresh();
    }

    public function findByJoinToken(string $token): CaseParty
    {
        return CaseParty::query()
            ->where('join_token', $token)
            ->where('join_token_expires_at', '>', now())
            ->firstOrFail();
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $photos
     */
    public function join(CaseParty $counterpartyParty, User $joiningUser, array $data, array $photos, ?UploadedFile $voiceStatement): AccidentCase
    {
        if ($counterpartyParty->unregistered_phone !== null && $counterpartyParty->unregistered_phone !== $joiningUser->phone) {
            throw ValidationException::withMessages([
                'phone' => ['رقم الهاتف لا يطابق الطرف المُبلَغ عنه في هذا الحادث.'],
            ]);
        }

        $case = $counterpartyParty->case;

        $counterpartyParty->forceFill([
            'user_id' => $joiningUser->id,
            'statement_text' => $data['statement'] ?? null,
            'joined_at' => now(),
            'join_token' => null,
            'join_token_expires_at' => null,
        ])->save();

        $this->evidence->storePhotos($case, $counterpartyParty, $joiningUser, $photos, (float) $case->lat, (float) $case->lng);

        if ($voiceStatement) {
            $this->evidence->storeOne($case, $counterpartyParty, $joiningUser, EvidenceType::Voice, $voiceStatement, (float) $case->lat, (float) $case->lng);
        }

        // Guarded, not unconditional: a dispatch_required case also needs
        // its surveyor dispatch to complete (App\Services\Cases\DispatchService)
        // — whichever finishes first wins, the other is a silent no-op.
        if ($this->lifecycle->canTransition($case, CaseStatus::EvidenceComplete)) {
            return $this->lifecycle->transition($case, CaseStatus::EvidenceComplete);
        }

        return $case->refresh();
    }

    private function activePolicyId(Vehicle $vehicle): ?int
    {
        return $vehicle->policies()
            ->where('verification_status', VerificationStatus::Verified->value)
            ->where('end_date', '>=', now()->toDateString())
            ->orderByDesc('end_date')
            ->value('id');
    }

    private function generateCaseNo(): string
    {
        do {
            $candidate = 'MC-'.now()->format('y').'-'.strtoupper(Str::random(6));
        } while (AccidentCase::where('case_no', $candidate)->exists());

        return $candidate;
    }
}
