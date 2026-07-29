<?php

return [
    /*
     | Pilot zone list (FR-C5) — a flat string matched against
     | accident_cases.region and users.zone. No real geo-distance routing;
     | that's a future upgrade once a real surveyor fleet + GPS exist.
     |
     | These MUST stay identical to the Arabic governorate names the intake
     | writes into `accident_cases.region` — the `ar` field of
     | apps/web/src/lib/regions.ts. DispatchService::pickSurveyor() compares
     | `users.zone` to `accident_cases.region` with plain equality and falls
     | back to any available surveyor when nothing matches, so a vocabulary
     | mismatch never throws — it silently disables zone routing. That is
     | exactly what happened between Sprint 9 and Sprint 11, when the wizard
     | began writing 'دمشق' while this list still said 'Damascus'.
     */
    'zones' => [
        'دمشق',
        'حلب',
        'حمص',
    ],
];
