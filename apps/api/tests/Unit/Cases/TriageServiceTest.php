<?php

namespace Tests\Unit\Cases;

use App\Enums\CaseTrack;
use App\Services\Cases\TriageService;
use Tests\TestCase;

class TriageServiceTest extends TestCase
{
    public function test_injury_flag_forces_police_required_regardless_of_other_facts(): void
    {
        $track = (new TriageService)->classify([
            'injury_flag' => true,
            'hit_and_run' => true,
            'uninsured_party' => true,
        ]);

        $this->assertSame(CaseTrack::PoliceRequired, $track);
    }

    public function test_hit_and_run_forces_dispatch_required(): void
    {
        $track = (new TriageService)->classify([
            'injury_flag' => false,
            'hit_and_run' => true,
            'uninsured_party' => false,
        ]);

        $this->assertSame(CaseTrack::DispatchRequired, $track);
    }

    public function test_uninsured_party_forces_dispatch_required(): void
    {
        $track = (new TriageService)->classify([
            'injury_flag' => false,
            'hit_and_run' => false,
            'uninsured_party' => true,
        ]);

        $this->assertSame(CaseTrack::DispatchRequired, $track);
    }

    public function test_no_matching_facts_default_to_fast_track(): void
    {
        $track = (new TriageService)->classify([
            'injury_flag' => false,
            'hit_and_run' => false,
            'uninsured_party' => false,
        ]);

        $this->assertSame(CaseTrack::FastTrack, $track);
    }
}
