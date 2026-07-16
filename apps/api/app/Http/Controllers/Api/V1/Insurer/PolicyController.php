<?php

namespace App\Http\Controllers\Api\V1\Insurer;

use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Policy\IndexInsurerPoliciesRequest;
use App\Http\Requests\Policy\RejectPolicyRequest;
use App\Http\Resources\InsurancePolicyResource;
use App\Models\InsurancePolicy;
use App\Services\Policy\PolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PolicyController extends Controller
{
    public function __construct(private readonly PolicyService $policies) {}

    public function index(IndexInsurerPoliciesRequest $request): JsonResponse
    {
        $status = $request->validated('status');

        $policies = $this->policies
            ->forOrganization(
                $request->user()->organization_id,
                $status !== null ? VerificationStatus::from($status) : null,
            )
            ->with('vehicle')
            ->get();

        return InsurancePolicyResource::collection($policies)->response();
    }

    public function verify(Request $request, InsurancePolicy $policy): JsonResponse
    {
        $this->authorize('verify', $policy);

        $policy = $this->policies->verify($policy, $request->user());

        return (new InsurancePolicyResource($policy))->response();
    }

    public function reject(RejectPolicyRequest $request, InsurancePolicy $policy): JsonResponse
    {
        $policy = $this->policies->reject($policy, $request->user(), $request->validated('reason'));

        return (new InsurancePolicyResource($policy))->response();
    }
}
