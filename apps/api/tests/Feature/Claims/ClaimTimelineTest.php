<?php

namespace Tests\Feature\Claims;

use App\Models\CaseParty;
use App\Models\Claim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClaimTimelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_claimant_can_view_their_own_claim_timeline(): void
    {
        $claimant = User::factory()->create();
        $party = CaseParty::factory()->create(['user_id' => $claimant->id]);
        $claim = Claim::factory()->create(['claimant_party_id' => $party->id]);

        $response = $this->actingAs($claimant)->getJson("/api/v1/claims/{$claim->id}");

        $response->assertOk()->assertJsonPath('data.id', $claim->id);
    }

    public function test_a_non_party_cannot_view_the_claim(): void
    {
        $claimant = User::factory()->create();
        $party = CaseParty::factory()->create(['user_id' => $claimant->id]);
        $claim = Claim::factory()->create(['claimant_party_id' => $party->id]);

        $intruder = User::factory()->create();

        $this->actingAs($intruder)->getJson("/api/v1/claims/{$claim->id}")->assertForbidden();
    }
}
