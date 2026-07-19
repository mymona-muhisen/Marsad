<?php

namespace App\Http\Controllers\Api\V1\Authority;

use App\Http\Controllers\Controller;
use App\Services\Analytics\AccidentAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AccidentAnalyticsService $analytics) {}

    public function heatmap(Request $request): JsonResponse
    {
        $filters = $request->only(['from', 'to', 'track']);

        return response()->json(['data' => $this->analytics->heatmap($filters)]);
    }

    public function blackSpots(Request $request): JsonResponse
    {
        $filters = $request->only(['from', 'to', 'track']);
        $limit = (int) $request->input('limit', 10);

        return response()->json(['data' => $this->analytics->blackSpots($filters, $limit)]);
    }
}
