<?php

namespace App\Services\Cases;

use App\Enums\CaseTrack;

/**
 * FR-C3: config-driven triage rules (config/triage.php). Facts are computed
 * by the caller (CaseService) from what's known at submission time.
 */
class TriageService
{
    /**
     * @param  array<string, bool>  $facts
     */
    public function classify(array $facts): CaseTrack
    {
        foreach (config('triage.rules') as $rule) {
            if (! empty($facts[$rule['fact']])) {
                return CaseTrack::from($rule['track']);
            }
        }

        return CaseTrack::from(config('triage.default_track'));
    }
}
