<?php

namespace Tests\Feature\Seeders;

use App\Enums\OrganizationType;
use App\Models\Organization;
use Database\Seeders\OrganizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_the_pilot_organizations(): void
    {
        (new OrganizationSeeder)->run();

        $this->assertSame(2, Organization::where('type', OrganizationType::Insurer->value)->count());
        $this->assertSame(1, Organization::where('type', OrganizationType::Regulator->value)->count());
        $this->assertSame(1, Organization::where('type', OrganizationType::Authority->value)->count());
        $this->assertSame(2, Organization::where('type', OrganizationType::Workshop->value)->count());
        $this->assertSame(1, Organization::where('type', OrganizationType::AssessorOffice->value)->count());
    }

    public function test_every_organization_type_has_somewhere_to_belong(): void
    {
        (new OrganizationSeeder)->run();

        // The org-scoped roles (insurer_agent, insurer_admin, assessor,
        // workshop) each need an organization of the matching type to exist.
        foreach (OrganizationType::cases() as $type) {
            $this->assertTrue(
                Organization::where('type', $type->value)->exists(),
                "No organization seeded for type {$type->value}.",
            );
        }
    }

    public function test_seeding_twice_does_not_duplicate_organizations(): void
    {
        (new OrganizationSeeder)->run();
        (new OrganizationSeeder)->run();

        $this->assertSame(7, Organization::count());
    }
}
