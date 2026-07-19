<?php

return [
    // Pilot zone list (FR-C5) — a flat string matched against
    // accident_cases.region and users.zone. No real geo-distance routing;
    // that's a future upgrade once a real surveyor fleet + GPS exist.
    'zones' => [
        'Damascus',
        'Aleppo',
        'Homs',
    ],
];
