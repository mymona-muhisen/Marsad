<?php

namespace App\Services\Admin;

use App\Models\LiabilityRule;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LiabilityRuleAdminService
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    /**
     * Publish a new version of a scenario's rule.
     *
     * Never an UPDATE (CLAUDE.md rule #5): decisions pin `rule_id`, so editing
     * a row in place would silently rewrite the justification of every decision
     * already issued under it. The previous version is closed with
     * `effective_to` and a new row supersedes it.
     *
     * @param  array{description_ar: string, fault_split_a: int, fault_split_b: int, effective_from: string}  $data
     */
    public function publish(User $actor, string $scenarioCode, array $data): LiabilityRule
    {
        if ($data['fault_split_a'] + $data['fault_split_b'] !== 100) {
            throw ValidationException::withMessages([
                'fault_split_a' => ['مجموع نسب القاعدة يجب أن يساوي 100.'],
            ]);
        }

        return DB::transaction(function () use ($actor, $scenarioCode, $data) {
            $current = LiabilityRule::query()
                ->where('scenario_code', $scenarioCode)
                ->whereNull('effective_to')
                ->orderByDesc('version')
                ->lockForUpdate()
                ->first();

            if ($current && $current->effective_from >= $data['effective_from']) {
                throw ValidationException::withMessages([
                    'effective_from' => ['تاريخ السريان يجب أن يكون بعد تاريخ النسخة الحالية.'],
                ]);
            }

            $current?->forceFill(['effective_to' => $data['effective_from']])->save();

            $rule = LiabilityRule::create([
                'scenario_code' => $scenarioCode,
                'description_ar' => $data['description_ar'],
                'fault_split_a' => $data['fault_split_a'],
                'fault_split_b' => $data['fault_split_b'],
                // First publication of a scenario starts at 1.
                'version' => $current === null ? 1 : $current->version + 1,
                'effective_from' => $data['effective_from'],
                'effective_to' => null,
            ]);

            // Reference-data versions are the other half of rule #9 the
            // observer never covered.
            $this->auditLog->log($actor, 'liability_rule_published', $rule, [
                'scenario_code' => $scenarioCode,
                'version' => $rule->version,
                'supersedes' => $current?->version,
            ]);

            return $rule;
        });
    }
}
