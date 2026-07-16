<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Policy\StorePolicyRequest;
use App\Http\Resources\InsurancePolicyResource;
use App\Models\Vehicle;
use App\Services\Policy\PolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PolicyController extends Controller
{
    public function __construct(private readonly PolicyService $policies) {}

    public function store(StorePolicyRequest $request, Vehicle $vehicle): JsonResponse
    {
        $policy = $this->policies->attach(
            $vehicle,
            $request->validated(),
            $request->file('document'),
        );

        return (new InsurancePolicyResource($policy))->response()->setStatusCode(201);
    }

    public function mine(Request $request): JsonResponse
    {
        $policies = $this->policies->forUser($request->user())
            ->with('insurer')
            ->get();

        return InsurancePolicyResource::collection($policies)->response();
    }
}
