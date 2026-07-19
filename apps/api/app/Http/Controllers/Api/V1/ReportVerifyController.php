<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReportVerifyResource;
use App\Services\Fault\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportVerifyController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function show(Request $request, string $qrToken): JsonResponse
    {
        $report = $this->reports->findByQrToken($qrToken);

        if (! $report) {
            return response()->json(['message' => 'No such report.'], 404);
        }

        return (new ReportVerifyResource($report))->response();
    }
}
