<?php

namespace App\Http\Controllers\Api\V1\Regulator;

use App\Http\Controllers\Controller;
use App\Services\Analytics\FraudFlagAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FraudFlagController extends Controller
{
    public function __construct(private readonly FraudFlagAnalyticsService $fraudFlags) {}

    public function show(Request $request): JsonResponse
    {
        $days = (int) $request->input('days', 30);

        return response()->json(['data' => $this->fraudFlags->summary($days)]);
    }
}
