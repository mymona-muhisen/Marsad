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

        // Fixed sign-ins and fixture data are development conveniences; a
        // production database must never carry known accounts.
        if (! app()->isProduction()) {
            $this->call([
                DemoUserSeeder::class,
                DemoSeeder::class,
            ]);
        }
    }
}
