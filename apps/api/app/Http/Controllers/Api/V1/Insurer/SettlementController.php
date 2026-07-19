<?php

namespace App\Http\Controllers\Api\V1\Insurer;

use App\Enums\SettlementMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Claims\RecordSettlementRequest;
use App\Http\Resources\SettlementResource;
use App\Models\Claim;
use App\Services\Claims\SettlementService;
use Illuminate\Http\JsonResponse;

class SettlementController extends Controller
{
    public function __construct(private readonly SettlementService $settlements) {}

    public function store(RecordSettlementRequest $request, Claim $claim): JsonResponse
    {
        $settlement = $this->settlements->record(
            $claim,
            $request->user(),
            SettlementMode::from($request->validated('mode')),
            (float) $request->validated('amount'),
            $request->validated('workshop_org_id'),
        );

        return (new SettlementResource($settlement))->response()->setStatusCode(201);
    }
}
