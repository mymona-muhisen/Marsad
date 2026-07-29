<?php

namespace App\Http\Controllers\Api\V1\Adjudication;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fault\DecideFaultRequest;
use App\Http\Resources\CaseResource;
use App\Http\Resources\FaultDecisionResource;
use App\Models\AccidentCase;
use App\Services\Fault\FaultDecisionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdjudicationController extends Controller
{
    public function __construct(private readonly FaultDecisionService $faultDecisions) {}

    public function queue(Request $request): JsonResponse
    {
        $cases = $this->faultDecisions->queue()
            // The queue rows show how many parties filed and whether both
            // statements are in, so the reviewer can pick what is ready.
            ->with('parties')
            ->paginate(min($request->integer('per_page', 15), 100));

        return CaseResource::collection($cases)->response();
    }

    public function decide(DecideFaultRequest $request, AccidentCase $case): JsonResponse
    {
        $decision = $this->faultDecisions->decide(
            $case,
            $request->user(),
            $request->validated('scenario_code'),
            $request->validated('allocations'),
            $request->validated('justification'),
        );

        return (new FaultDecisionResource($decision->load('allocations')))->response()->setStatusCode(201);
    }
}
