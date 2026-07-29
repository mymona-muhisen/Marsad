<?php

namespace Tests\Unit\Cases;

use Tests\TestCase;

/**
 * Guards the coupling that broke silently between Sprints 9 and 11.
 *
 * `DispatchService::pickSurveyor()` matches `users.zone` against
 * `accident_cases.region` with plain equality and falls back to any free
 * surveyor when nothing matches — so if the two vocabularies drift, zone-based
 * routing (FR-C5) stops working without a single failure anywhere. The existing
 * dispatch tests cannot catch it: they set both sides to the same literal, so
 * they pass under any vocabulary at all.
 */
class ZoneVocabularyTest extends TestCase
{
    public function test_every_pilot_zone_is_a_real_governorate(): void
    {
        $governorates = config('regions.governorates');

        foreach (config('zones.zones') as $zone) {
            $this->assertContains(
                $zone,
                $governorates,
                "Zone '{$zone}' is not one of the governorate names the intake writes into accident_cases.region, so no self-reported case can ever match it.",
            );
        }
    }

    public function test_the_governorate_list_is_the_full_fourteen(): void
    {
        // Pinned so a partial edit here shows up as a failure rather than
        // quietly shrinking the vocabulary the frontend still offers.
        $this->assertCount(14, config('regions.governorates'));
    }
}
