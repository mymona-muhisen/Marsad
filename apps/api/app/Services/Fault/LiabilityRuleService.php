<?php

namespace App\Services\Fault;

use App\Models\LiabilityRule;
use Illuminate\Support\Collection;

class LiabilityRuleService
{
    /**
     * The liability matrix as it stands today: one row per scenario, the
     * highest still-effective version of each.
     *
     * Reference data is versioned rather than updated in place (CLAUDE.md rule
     * 5), so a scenario can have several rows and only the newest un-retired
     * one may be proposed. The set is reference data of a dozen or so rows, so
     * it is reduced in PHP rather than with a correlated subquery — obviously
     * correct beats clever at this size, and it is fetched once per console
     * load.
     *
     * @return Collection<int, LiabilityRule>
     */
    public function current(): Collection
    {
        return LiabilityRule::query()
            ->whereNull('effective_to')
            ->orderBy('scenario_code')
            ->orderByDesc('version')
            ->get()
            // Ordered version-descending, so the first row per scenario wins.
            ->unique('scenario_code')
            ->values();
    }
}
