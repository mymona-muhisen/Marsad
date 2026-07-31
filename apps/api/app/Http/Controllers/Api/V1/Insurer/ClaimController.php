<?php

namespace App\Http\Controllers\Api\V1\Insurer;

use App\Enums\ClaimDecisionOutcome;
use App\Enums\ClaimStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Claims\AssignAssessorRequest;
use App\Http\Requests\Claims\DecideClaimRequest;
use App\Http\Requests\Claims\IndexInsurerClaimsRequest;
use App\Http\Resources\ClaimResource;
use App\Models\Claim;
use App\Services\Claims\AssessorAssignmentService;
use App\Services\Claims\ClaimService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClaimController extends Controller
{
    public function __construct(
        private readonly ClaimService $claims,
        private readonly AssessorAssignmentService $assignments,
    ) {}

    public function index(IndexInsurerClaimsRequest $request): JsonResponse
    {
        $status = $request->validated('status');

        $claims = $this->claims
            ->forOrganization(
                $request->user()->organization_id,
                $status !== null ? ClaimStatus::from($status) : null,
                (bool) $request->validated('sla_breached', false),
            )
            ->paginate(min($request->integer('per_page', 15), 100));

        return ClaimResource::collection($claims)->response();
    }

    public function show(Request $request, Claim $claim): JsonResponse
    {
        // 'view', not 'manage' — reading a claim is not acting on one, and the
        // insurer admin reads without the authority to decide.
        $this->authorize('view', $claim);

        $claim->load(['events', 'estimates.items', 'settlement']);

        return (new ClaimResource($claim))->response();
    }

    public function decide(DecideClaimRequest $request, Claim $claim): JsonResponse
    {
        $claim = $this->claims->decide(
            $claim,
            $request->user(),
            ClaimDecisionOutcome::from($request->validated('outcome')),
            $request->validated('reason_code'),
            $request->validated('note'),
        );

        return (new ClaimResource($claim))->response();
    }

    /**
     * Put an assessor office or workshop on the claim, or clear it.
     *
     * Until this existed nothing recorded the insurer's choice, so the estimate
     * endpoint had nothing to authorise against.
     */
    public function assignAssessor(AssignAssessorRequest $request, Claim $claim): JsonResponse
    {
        $claim = $this->assignments->assign(
            $claim,
            $request->user(),
            $request->validated('assessor_org_id'),
        );

        return (new ClaimResource($claim))->response();
    }
}
