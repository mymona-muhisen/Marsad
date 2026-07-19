<?php

namespace Tests\Feature\Fault;

use App\Enums\CaseStatus;
use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\FaultDecision;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdjudicationQueueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function adjudicator(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleName::Adjudicator->value);

        return $user;
    }

    public function test_queue_returns_evidence_complete_cases_in_fifo_order(): void
    {
        $older = AccidentCase::factory()->create([
            'status' => CaseStatus::EvidenceComplete->value,
            'created_at' => now()->subHours(2),
        ]);
        $newer = AccidentCase::factory()->create([
            'status' => CaseStatus::EvidenceComplete->value,
            'created_at' => now()->subHour(),
        ]);

        $response = $this->actingAs($this->adjudicator())->getJson('/api/v1/adjudication/queue');

        $response->assertOk();
        $this->assertSame($older->case_no, $response->json('data.0.case_no'));
        $this->assertSame($newer->case_no, $response->json('data.1.case_no'));
    }

    public function test_queue_excludes_cases_that_already_have_a_decision(): void
    {
        $decided = AccidentCase::factory()->create(['status' => CaseStatus::EvidenceComplete->value]);
        FaultDecision::factory()->create(['case_id' => $decided->id]);

        $pending = AccidentCase::factory()->create(['status' => CaseStatus::EvidenceComplete->value]);

        $response = $this->actingAs($this->adjudicator())->getJson('/api/v1/adjudication/queue');

        $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.case_no', $pending->case_no);
    }

    public function test_non_adjudicator_cannot_access_the_queue(): void
    {
        $citizen = User::factory()->create();

        $this->actingAs($citizen)->getJson('/api/v1/adjudication/queue')->assertForbidden();
    }
}
