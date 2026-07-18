<?php

namespace App\Http\Controllers\Api\V1\Adjudication;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fault\ResolveObjectionRequest;
use App\Http\Requests\Fault\SubmitObjectionRequest;
use App\Http\Resources\ObjectionResource;
use App\Models\AccidentCase;
use App\Models\Objection;
use App\Services\Fault\ObjectionService;
use Illuminate\Http\JsonResponse;

class ObjectionController extends Controller
{
    public function __construct(private readonly ObjectionService $objections) {}

    public function store(SubmitObjectionRequest $request, AccidentCase $case): JsonResponse
    {
        $decision = $case->faultDecision()->firstOrFail();

        $objection = $this->objections->submit($decision, $request->user(), $request->validated('reason'));

        return (new ObjectionResource($objection))->response()->setStatusCode(201);
    }

    public function resolve(ResolveObjectionRequest $request, Objection $objection): JsonResponse
    {
        $resolved = $this->objections->resolve(
            $objection,
            $request->user(),
            $request->validated('outcome'),
            $request->validated('resolution_note'),
            $request->validated('amended_allocations'),
        );

        return (new ObjectionResource($resolved))->response();
    }
}
