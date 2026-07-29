<?php

return [
    /*
     | Syria's 14 governorates — the canonical vocabulary for
     | `accident_cases.region`.
     |
     | The intake writes one of these strings; the heatmap and black-spot
     | analytics group on it; `config/zones.php` draws the pilot surveyor zones
     | from it. `apps/web/src/lib/regions.ts` carries the same list (with
     | coordinates) because the wizard needs it offline — the two are pinned
     | together by tests on both sides.
     |
     | Serving this list from an endpoint instead of duplicating it is the
     | proper fix; see DECISIONS.md.
     */
    'governorates' => [
        'دمشق',
        'ريف دمشق',
        'حلب',
        'حمص',
        'حماة',
        'اللاذقية',
        'طرطوس',
        'إدلب',
        'دير الزور',
        'الرقة',
        'الحسكة',
        'درعا',
        'السويداء',
        'القنيطرة',
    ],
];
