<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('marsad:policy-expiry-reminders')->daily();
Schedule::command('marsad:flag-one-sided-cases')->hourly();
Schedule::command('marsad:close-objection-windows')->hourly();
Schedule::command('marsad:flag-sla-breaches')->hourly();
