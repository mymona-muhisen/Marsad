<?php

use App\Http\Controllers\Api\V1\Adjudication\AdjudicationController;
use App\Http\Controllers\Api\V1\Adjudication\LiabilityRuleController;
use App\Http\Controllers\Api\V1\Adjudication\ObjectionController;
use App\Http\Controllers\Api\V1\Auth\OtpController;
use App\Http\Controllers\Api\V1\Auth\SessionController;
use App\Http\Controllers\Api\V1\Authority\AnalyticsController as AuthorityAnalyticsController;
use App\Http\Controllers\Api\V1\CaseController;
use App\Http\Controllers\Api\V1\CaseJoinController;
use App\Http\Controllers\Api\V1\ClaimController;
use App\Http\Controllers\Api\V1\EstimateController;
use App\Http\Controllers\Api\V1\EvidenceController;
use App\Http\Controllers\Api\V1\Insurer\ClaimController as InsurerClaimController;
use App\Http\Controllers\Api\V1\Insurer\PolicyController as InsurerPolicyController;
use App\Http\Controllers\Api\V1\Insurer\SettlementController;
use App\Http\Controllers\Api\V1\PolicyController;
use App\Http\Controllers\Api\V1\Regulator\FraudFlagController;
use App\Http\Controllers\Api\V1\Regulator\SlaReportController;
use App\Http\Controllers\Api\V1\ReportVerifyController;
use App\Http\Controllers\Api\V1\Surveyor\DispatchController as SurveyorDispatchController;
use App\Http\Controllers\Api\V1\VehicleController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::prefix('auth/otp')->group(function () {
        Route::post('request', [OtpController::class, 'request'])->middleware('throttle:otp-request');
        Route::post('verify', [OtpController::class, 'verify']);
    });

    // Public: counterparty deep-link preview (UC-02 step 3 — no auth, no statement leaked).
    Route::get('cases/join/{token}', [CaseJoinController::class, 'show'])->middleware('throttle:30,1');

    // Public: report authenticity check (UC-07) — no auth, no personal data.
    Route::get('reports/verify/{qrToken}', [ReportVerifyController::class, 'show'])->middleware('throttle:30,1');

    // Public (signature is the credential, CLAUDE.md hardening — signed
    // temporary URLs for evidence media): no Sanctum auth on this route.
    Route::get('evidence/{evidence}/download', [EvidenceController::class, 'download'])
        ->name('evidence.download')
        ->middleware(['signed', 'throttle:60,1']);

    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
        // Session restore on reload + single-device sign-out.
        Route::get('auth/me', [SessionController::class, 'me']);
        Route::post('auth/logout', [SessionController::class, 'logout']);

        Route::apiResource('vehicles', VehicleController::class);
        Route::post('vehicles/{vehicle}/restore', [VehicleController::class, 'restore']);
        Route::post('vehicles/{vehicle}/policies', [PolicyController::class, 'store']);
        Route::get('policies', [PolicyController::class, 'mine']);

        Route::prefix('insurer')->middleware('role:insurer_agent')->group(function () {
            Route::get('policies', [InsurerPolicyController::class, 'index']);
            Route::post('policies/{policy}/verify', [InsurerPolicyController::class, 'verify']);
            Route::post('policies/{policy}/reject', [InsurerPolicyController::class, 'reject']);

            Route::get('claims', [InsurerClaimController::class, 'index']);
            Route::get('claims/{claim}', [InsurerClaimController::class, 'show']);
            Route::post('claims/{claim}/decide', [InsurerClaimController::class, 'decide']);
            Route::post('claims/{claim}/settlement', [SettlementController::class, 'store']);
        });

        Route::get('cases', [CaseController::class, 'index']);
        Route::post('cases', [CaseController::class, 'store']);
        Route::post('cases/join/{token}', [CaseJoinController::class, 'join']);
        Route::get('cases/{case}', [CaseController::class, 'show']);
        Route::post('evidence/{evidence}/supersede', [EvidenceController::class, 'supersede']);

        Route::prefix('surveyor')->middleware('role:surveyor')->group(function () {
            Route::get('dispatches', [SurveyorDispatchController::class, 'index']);
            Route::post('dispatches/{dispatch}/accept', [SurveyorDispatchController::class, 'accept']);
            Route::post('dispatches/{dispatch}/decline', [SurveyorDispatchController::class, 'decline']);
            Route::post('dispatches/{dispatch}/on-scene', [SurveyorDispatchController::class, 'markOnScene']);
            Route::post('dispatches/{dispatch}/complete', [SurveyorDispatchController::class, 'complete']);
        });

        Route::post('cases/{case}/objections', [ObjectionController::class, 'store']);
        Route::get('evidence/{evidence}/download-url', [EvidenceController::class, 'downloadUrl']);

        Route::prefix('adjudication')->middleware('role:adjudicator')->group(function () {
            Route::get('queue', [AdjudicationController::class, 'queue']);
            Route::post('cases/{case}/decide', [AdjudicationController::class, 'decide']);
        });

        // The matrix itself — read by both the decision form and the appeals
        // panel, which may amend allocations when resolving an objection.
        Route::get('liability-rules', [LiabilityRuleController::class, 'index'])
            ->middleware('role:adjudicator|senior_adjudicator');

        Route::prefix('adjudication')->middleware('role:senior_adjudicator')->group(function () {
            Route::post('objections/{objection}/resolve', [ObjectionController::class, 'resolve']);
        });

        Route::get('claims', [ClaimController::class, 'index']);
        Route::get('claims/{claim}', [ClaimController::class, 'show']);
        Route::post('claims/{claim}/estimates', [EstimateController::class, 'store'])->middleware('role:assessor|workshop');

        Route::prefix('regulator')->middleware('role:regulator')->group(function () {
            Route::get('sla-report', [SlaReportController::class, 'show']);
            Route::get('fraud-flags', [FraudFlagController::class, 'show']);
        });

        Route::prefix('authority')->middleware('role:authority')->group(function () {
            Route::get('heatmap', [AuthorityAnalyticsController::class, 'heatmap']);
            Route::get('black-spots', [AuthorityAnalyticsController::class, 'blackSpots']);
        });
    });
});
