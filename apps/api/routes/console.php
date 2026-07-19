<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('masar:policy-expiry-reminders')->daily();
Schedule::command('masar:flag-one-sided-cases')->hourly();
Schedule::command('masar:close-objection-windows')->hourly();
