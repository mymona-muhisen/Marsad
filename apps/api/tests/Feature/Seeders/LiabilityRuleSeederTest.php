<?php

namespace Tests\Feature\Seeders;

use App\Models\LiabilityRule;
use Database\Seeders\LiabilityRuleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiabilityRuleSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_at_least_ten_scenarios_with_valid_splits(): void
    {
        (new LiabilityRuleSeeder)->run();

        $this->assertGreaterThanOrEqual(10, LiabilityRule::count());

        LiabilityRule::all()->each(function (LiabilityRule $rule) {
            $this->assertSame(100, $rule->fault_split_a + $rule->fault_split_b);
        });
    }

    public function test_seeding_twice_does_not_duplicate_rows(): void
    {
        (new LiabilityRuleSeeder)->run();
        $count = LiabilityRule::count();

        (new LiabilityRuleSeeder)->run();

        $this->assertSame($count, LiabilityRule::count());
    }
}
