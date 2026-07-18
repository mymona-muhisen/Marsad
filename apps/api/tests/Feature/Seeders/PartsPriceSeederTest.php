<?php

namespace Tests\Feature\Seeders;

use App\Models\PartsPrice;
use Database\Seeders\PartsPriceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartsPriceSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_at_least_thirty_parts(): void
    {
        (new PartsPriceSeeder)->run();

        $this->assertGreaterThanOrEqual(30, PartsPrice::count());
    }

    public function test_seeding_twice_does_not_duplicate_rows(): void
    {
        (new PartsPriceSeeder)->run();
        $count = PartsPrice::count();

        (new PartsPriceSeeder)->run();

        $this->assertSame($count, PartsPrice::count());
    }
}
