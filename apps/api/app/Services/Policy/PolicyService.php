<?php

namespace App\Services\Policy;

use App\Contracts\PolicyVerifier;
use App\Contracts\SmsGateway;
use App\Enums\NotificationChannel;
use App\Enums\VerificationStatus;
use App\Models\InsurancePolicy;
use App\Models\Notification;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;

class PolicyService
{
    public function __construct(
        private readonly PolicyVerifier $policyVerifier,
        private readonly SmsGateway $smsGateway,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function attach(Vehicle $vehicle, array $data, UploadedFile $document): InsurancePolicy
    {
        $path = $document->store('policies', 'public');

        return InsurancePolicy::create([
            'vehicle_id' => $vehicle->id,
            'insurer_org_id' => $data['insurer_org_id'],
            'policy_no' => $data['policy_no'],
            'type' => $data['type'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'verification_status' => VerificationStatus::Pending,
            'document_path' => $path,
        ]);
    }

    public function verify(InsurancePolicy $policy, User $verifier): InsurancePolicy
    {
        $this->policyVerifier->verify($policy, $verifier);

        $this->notifyOwner($policy, 'policy_verified', 'تم توثيق وثيقة التأمين الخاصة بك.');

        return $policy->refresh();
    }

    public function reject(InsurancePolicy $policy, User $verifier, ?string $reason): InsurancePolicy
    {
        $this->policyVerifier->reject($policy, $verifier, $reason);

        $message = $reason !== null
            ? "تم رفض وثيقة التأمين الخاصة بك. السبب: {$reason}"
            : 'تم رفض وثيقة التأمين الخاصة بك.';

        $this->notifyOwner($policy, 'policy_rejected', $message);

        return $policy->refresh();
    }

    /**
     * @return Builder<InsurancePolicy>
     */
    public function forOrganization(int $organizationId, ?VerificationStatus $status = null): Builder
    {
        return InsurancePolicy::query()
            ->where('insurer_org_id', $organizationId)
            ->when($status !== null, fn (Builder $query) => $query->where('verification_status', $status));
    }

    /**
     * @return Builder<InsurancePolicy>
     */
    public function forUser(User $user): Builder
    {
        return InsurancePolicy::query()
            ->whereHas('vehicle', fn (Builder $query) => $query->where('owner_id', $user->id));
    }

    private function notifyOwner(InsurancePolicy $policy, string $template, string $message): void
    {
        $owner = $policy->vehicle->owner;

        $this->smsGateway->send($owner->phone, $message);

        Notification::create([
            'user_id' => $owner->id,
            'channel' => NotificationChannel::Sms,
            'template' => $template,
            'payload' => ['policy_id' => $policy->id],
            'sent_at' => now(),
        ]);
    }
}
