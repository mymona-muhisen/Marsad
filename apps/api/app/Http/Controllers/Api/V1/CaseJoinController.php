<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cases\JoinCaseRequest;
use App\Http\Resources\CaseJoinTeaserResource;
use App\Http\Resources\CaseResource;
use App\Services\Cases\CaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaseJoinController extends Controller
{
    public function __construct(private readonly CaseService $cases) {}

    public function show(Request $request, string $token): JsonResponse
    {
        $party = $this->cases->findByJoinToken($token);

        return (new CaseJoinTeaserResource($party))->response();
    }

    public function join(JoinCaseRequest $request, string $token): JsonResponse
    {
        $party = $this->cases->findByJoinToken($token);

        $case = $this->cases->join(
            $party,
            $request->user(),
            $request->validated(),
            $request->file('photos', []),
            $request->file('voice_statement'),
        );

        return (new CaseResource($case))->response();
    }
}
