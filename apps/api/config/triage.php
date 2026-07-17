<?php

return [
    // Evaluated in order; the first matching fact wins (FR-C3 — rules
    // configurable by admin without touching TriageService's code).
    'rules' => [
        ['fact' => 'injury_flag', 'track' => 'police_required'],
        ['fact' => 'hit_and_run', 'track' => 'dispatch_required'],
        ['fact' => 'uninsured_party', 'track' => 'dispatch_required'],
    ],

    'default_track' => 'fast_track',
];
