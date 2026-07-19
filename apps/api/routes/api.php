<?php

use App\Http\Controllers\Api\V1\Auth\OtpController;
use App\Http\Controllers\Api\V1\CaseController;
use App\Http\Controllers\Api\V1\CaseJoinController;
use App\Http\Controllers\Api\V1\EvidenceController;
use App\Http\Controllers\Api\V1\Insurer\PolicyController as InsurerPolicyController;
use App\Http\Controllers\Api\V1\PolicyController;
use App\Http\Controllers\Api\V1\VehicleController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::prefix('auth/otp')->group(function () {
        Route::post('request', [OtpController::class, 'request'])->middleware('throttle:otp-request');
        Route::post('verify', [OtpController::class, 'verify']);
    });

    // Public: counterparty deep-link preview (UC-02 step 3 — no auth, no statement leaked).
    Route::get('cases/join/{token}', [CaseJoinController::class, 'show'])->middleware('throttle:30,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('vehicles', VehicleController::class);
        Route::post('vehicles/{vehicle}/restore', [VehicleController::class, 'restore']);
        Route::post('vehicles/{vehicle}/policies', [PolicyController::class, 'store']);
        Route::get('policies', [PolicyController::class, 'mine']);

        Route::prefix('insurer')->middleware('role:insurer_agent')->group(function () {
            Route::get('policies', [InsurerPolicyController::class, 'index']);
            Route::post('policies/{policy}/verify', [InsurerPolicyController::class, 'verify']);
            Route::post('policies/{policy}/reject', [InsurerPolicyController::class, 'reject']);
        });

        Route::post('cases', [CaseController::class, 'store']);
        Route::post('cases/join/{token}', [CaseJoinController::class, 'join']);
        Route::get('cases/{case}', [CaseController::class, 'show']);
        Route::post('evidence/{evidence}/supersede', [EvidenceController::class, 'supersede']);
    });
});
