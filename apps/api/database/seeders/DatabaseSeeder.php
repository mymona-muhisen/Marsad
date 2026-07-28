<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database (doc 04 §6 Phase 7 order).
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            OrganizationSeeder::class,
            LiabilityRuleSeeder::class,
            PartsPriceSeeder::class,
        ]);

        if (! app()->isProduction()) {
            $this->call(DemoSeeder::class);
        }
    }
}
