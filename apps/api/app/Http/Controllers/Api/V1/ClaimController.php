<?php

namespace App\Http\Controllers\Api\V1;

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
     * The caller's own claims. Scoped by claimant party, which is the same
     * condition `ClaimPolicy::view` applies to a single claim — a user cannot
     * list a claim they would be refused on show.
     */
    public function index(Request $request): JsonResponse
    {
        $claims = $this->claims->forClaimant($request->user())
            ->with('case')
            ->latest()
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
