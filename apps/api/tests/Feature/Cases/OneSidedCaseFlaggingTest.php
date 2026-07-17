<?php

namespace Tests\Feature\Cases;

use App\Enums\CaseStatus;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Services\Cases\OneSidedCaseFlaggingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OneSidedCaseFlaggingTest extends TestCase
{
    use RefreshDatabase;

    public function test_case_with_an_expired_join_token_is_flagged_one_sided_and_advances(): void
    {
        $case = AccidentCase::factory()->create(['status' => CaseStatus::AwaitingCounterparty->value]);
        CaseParty::factory()->counterparty()->create([
            'case_id' => $case->id,
            'join_token' => 'expired-token',
            'join_token_expires_at' => now()->subMinute(),
        ]);

        $flagged = $this->app->make(OneSidedCaseFlaggingService::class)->run();

        $this->assertSame(1, $flagged);
        $this->assertDatabaseHas('accident_cases', [
            'id' => $case->id,
            'status' => CaseStatus::EvidenceComplete->value,
            'one_sided_flag' => true,
        ]);
    }

    public function test_case_with_a_still_valid_join_token_is_not_flagged(): void
    {
        $case = AccidentCase::factory()->create(['status' => CaseStatus::AwaitingCounterparty->value]);
        CaseParty::factory()->counterparty()->create([
            'case_id' => $case->id,
            'join_token' => 'valid-token',
            'join_token_expires_at' => now()->addHours(12),
        ]);

        $flagged = $this->app->make(OneSidedCaseFlaggingService::class)->run();

        $this->assertSame(0, $flagged);
        $this->assertDatabaseHas('accident_cases', [
            'id' => $case->id,
            'status' => CaseStatus::AwaitingCounterparty->value,
        ]);
    }
}
