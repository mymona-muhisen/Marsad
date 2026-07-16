<?php

namespace App\Services\Policy;

use App\Contracts\SmsGateway;
use App\Enums\NotificationChannel;
use App\Enums\VerificationStatus;
use App\Models\InsurancePolicy;
use App\Models\Notification;
use Illuminate\Support\Carbon;

class PolicyExpiryReminderService
{
    /**
     * @var list<int>
     */
    private const THRESHOLDS = [30, 7, 1];

    public function __construct(private readonly SmsGateway $smsGateway) {}

    public function run(): int
    {
        $sent = 0;

        foreach (self::THRESHOLDS as $days) {
            $targetDate = Carbon::today()->addDays($days)->toDateString();

            $policies = InsurancePolicy::query()
                ->where('verification_status', VerificationStatus::Verified)
                ->whereDate('end_date', $targetDate)
                ->with('vehicle.owner')
                ->get();

            foreach ($policies as $policy) {
                $template = "policy_expiry_{$days}";

                if ($this->alreadySent($policy, $template)) {
                    continue;
                }

                $this->remind($policy, $days, $template);
                $sent++;
            }
        }

        return $sent;
    }

    private function alreadySent(InsurancePolicy $policy, string $template): bool
    {
        return Notification::query()
            ->where('template', $template)
            ->whereJsonContains('payload->policy_id', $policy->id)
            ->exists();
    }

    private function remind(InsurancePolicy $policy, int $days, string $template): void
    {
        $owner = $policy->vehicle->owner;

        $message = "تنبيه: وثيقة التأمين رقم {$policy->policy_no} ستنتهي خلال {$days} يوم/أيام.";

        $this->smsGateway->send($owner->phone, $message);

        Notification::create([
            'user_id' => $owner->id,
            'channel' => NotificationChannel::Sms,
            'template' => $template,
            'payload' => ['policy_id' => $policy->id, 'days_remaining' => $days],
            'sent_at' => now(),
        ]);
    }
}
