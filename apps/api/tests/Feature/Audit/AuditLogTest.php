<?php

namespace Tests\Feature\Audit;

use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\Claim;
use App\Models\FaultDecision;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_creating_a_fault_decision_as_an_authenticated_adjudicator_is_audited(): void
    {
        $adjudicator = User::factory()->create();
        $adjudicator->assignRole(RoleName::Adjudicator->value);

        $this->actingAs($adjudicator);

        $decision = FaultDecision::factory()->create(['adjudicator_id' => $adjudicator->id]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $adjudicator->id,
            'action' => 'created',
            'entity_type' => 'FaultDecision',
            'entity_id' => $decision->id,
        ]);
    }

    public function test_updating_a_fault_decision_is_audited_with_only_the_changed_fields(): void
    {
        $adjudicator = User::factory()->create();
        $adjudicator->assignRole(RoleName::Adjudicator->value);
        $this->actingAs($adjudicator);

        $decision = FaultDecision::factory()->create(['adjudicator_id' => $adjudicator->id]);

        $decision->forceFill(['justification' => 'تعديل تجريبي'])->save();

        $log = AuditLog::query()
            ->where('entity_type', 'FaultDecision')
            ->where('entity_id', $decision->id)
            ->where('action', 'updated')
            ->firstOrFail();

        $this->assertArrayHasKey('justification', $log->changes);
        $this->assertArrayNotHasKey('adjudicator_id', $log->changes);
    }

    public function test_updating_a_claim_as_an_authenticated_insurer_agent_is_audited(): void
    {
        $org = Organization::factory()->create(['type' => 'insurer']);
        $agent = User::factory()->create(['organization_id' => $org->id]);
        $agent->assignRole(RoleName::InsurerAgent->value);
        $this->actingAs($agent);

        $claim = Claim::factory()->create(['insurer_org_id' => $org->id]);
        $claim->forceFill(['status' => 'approved'])->save();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $agent->id,
            'action' => 'updated',
            'entity_type' => 'Claim',
            'entity_id' => $claim->id,
        ]);
    }

    public function test_system_triggered_claim_creation_is_not_audited_to_an_arbitrary_user(): void
    {
        // No authenticated user — simulating a scheduled-job/system context
        // (e.g. claim auto-open, which has no human actor to attribute to).
        $this->assertGuest();

        Claim::factory()->create();

        $this->assertDatabaseCount('audit_logs', 0);
    }
}
