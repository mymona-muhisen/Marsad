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

        $case->load('parties.evidenceItems');

        return (new CaseResource($case))->response();
    }
}
