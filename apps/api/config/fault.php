<?php

return [
    /*
     | FR-F3: parties may object to a liability decision within this window,
     | measured from `fault_decisions.decided_at`.
     |
     | Read by ObjectionService (rejects late objections), ObjectionWindowService
     | (the scheduled job that finalises expired decisions), and FaultDecisionResource
     | (the countdown shown to the citizen). Those three must never disagree,
     | which is why the number lives here rather than in each class.
     */
    'objection_window_hours' => env('FAULT_OBJECTION_WINDOW_HOURS', 72),
];
