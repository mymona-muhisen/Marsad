<?php

namespace App\Http\Controllers\Api\V1\Assessor;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClaimResource;
use App\Models\Claim;
use App\Services\Claims\ClaimService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClaimController extends Controller
{
    public function __construct(private readonly ClaimService $claims) {}

    /**
     * Claims this office was actually put on.
     *
     * Scoped by `assessor_org_id`, which is the same condition
     * `ClaimPolicy::estimate` enforces on a single claim — an assessor cannot
     * list a claim they would be refused on submit.
     */
    public function index(Request $request): JsonResponse
    {
        $claims = $this->claims->forAssessor($request->user())
            ->with('case')
            ->latest('sla_due_at')
            ->paginate(min($request->integer('per_page', 15), 100));

        return ClaimResource::collection($claims)->response();
    }

    public function show(Request $request, Claim $claim): JsonResponse
    {
        $this->authorize('view', $claim);

        $claim->load(['case', 'events', 'estimates.items', 'settlement']);

        return (new ClaimResource($claim))->response();
    }
}
