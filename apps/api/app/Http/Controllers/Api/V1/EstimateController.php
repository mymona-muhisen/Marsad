<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DamageEstimateType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Claims\SubmitEstimateRequest;
use App\Http\Resources\DamageEstimateResource;
use App\Models\Claim;
use App\Services\Claims\DamageEstimateService;
use Illuminate\Http\JsonResponse;

class EstimateController extends Controller
{
    public function __construct(private readonly DamageEstimateService $estimates) {}

    public function store(SubmitEstimateRequest $request, Claim $claim): JsonResponse
    {
        $estimate = $this->estimates->submit(
            $claim,
            $request->user(),
            $request->user()->organization_id,
            DamageEstimateType::from($request->validated('type')),
            $request->validated('items'),
        );

        return (new DamageEstimateResource($estimate))->response()->setStatusCode(201);
    }
}
