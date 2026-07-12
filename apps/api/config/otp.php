<?php

return [
    // Minutes before a requested code expires.
    'ttl_minutes' => env('OTP_TTL_MINUTES', 5),

    // Wrong-code attempts allowed against a single code before it is invalidated.
    'max_attempts' => env('OTP_MAX_ATTEMPTS', 5),

    // Rate limit on /otp/request, keyed by phone number.
    'request_max_per_window' => env('OTP_REQUEST_MAX_PER_WINDOW', 3),
    'request_window_minutes' => env('OTP_REQUEST_WINDOW_MINUTES', 10),
];
