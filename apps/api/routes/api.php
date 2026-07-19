<?php

use App\Http\Controllers\Api\V1\Auth\OtpController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::prefix('auth/otp')->group(function () {
        Route::post('request', [OtpController::class, 'request'])->middleware('throttle:otp-request');
        Route::post('verify', [OtpController::class, 'verify']);
    });
});
