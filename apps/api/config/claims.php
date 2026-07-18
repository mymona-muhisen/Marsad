<?php

return [
    // Days from claim.opened_at (claims.sla_due_at) to the SLA deadline.
    // Doc 01/04 don't give an explicit claims SLA figure (only report
    // issuance SLA — 48h fast track / 5 days disputed); 5 days was chosen
    // as a reasonable default pending a real regulator-set figure.
    'sla_days' => env('CLAIMS_SLA_DAYS', 5),

    // FR-CL3: an estimate line whose unit_price deviates from the active
    // parts_prices reference by more than this percentage is deviation_flag'd.
    'deviation_threshold_percent' => env('CLAIMS_DEVIATION_THRESHOLD_PERCENT', 15),
];
