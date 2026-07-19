<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cases\SupersedeEvidenceRequest;
use App\Http\Resources\EvidenceItemResource;
use App\Models\EvidenceItem;
use App\Services\Cases\EvidenceService;
use Illuminate\Http\JsonResponse;

class EvidenceController extends Controller
{
    public function __construct(private readonly EvidenceService $evidence) {}

    public function supersede(SupersedeEvidenceRequest $request, EvidenceItem $evidence): JsonResponse
    {
        $replacement = $this->evidence->supersede($evidence, $request->user(), $request->file('file'));

        return (new EvidenceItemResource($replacement))->response()->setStatusCode(201);
    }
}
