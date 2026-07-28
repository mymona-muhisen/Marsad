<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cases\StoreCaseRequest;
use App\Http\Resources\CaseResource;
use App\Models\AccidentCase;
use App\Services\Cases\CaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaseController extends Controller
{
    public function __construct(private readonly CaseService $cases) {}

    /**
     * The caller's own cases. Scoped by party membership, so it needs no
     * policy check — a user simply cannot see a case they are not part of.
     */
    public function index(Request $request): JsonResponse
    {
        $cases = $this->cases->forUser($request->user())
            ->paginate(min($request->integer('per_page', 15), 100));

        return CaseResource::collection($cases)->response();
    }

    public function store(StoreCaseRequest $request): JsonResponse
    {
        $case = $this->cases->createFromReport(
            $request->user(),
            $request->validated(),
            $request->file('photos', []),
            $request->file('voice_statement'),
        );

        return (new CaseResource($case))->response()->setStatusCode(201);
    }

    public function show(Request $request, AccidentCase $case): JsonResponse
    {
        $this->authorize('view', $case);

        // Everything the citizen case view renders in one round trip: the
        // evidence gallery, the decision with the rule it cites, any objection
        // already filed, the issued report, and the resulting claims.
        $case->load([
            'parties.evidenceItems',
            'faultDecision.rule',
            'faultDecision.allocations',
            'faultDecision.objections',
            'reports',
            'claims',
        ]);

        return (new CaseResource($case))->response();
    }
}
