<?php

namespace App\Http\Controllers\Api\V1\Regulator;

use App\Http\Controllers\Controller;
use App\Services\Claims\RegulatorReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SlaReportController extends Controller
{
    public function __construct(private readonly RegulatorReportService $reports) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->reports->slaReport()]);
    }
}
