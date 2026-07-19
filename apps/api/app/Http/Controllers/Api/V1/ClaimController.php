<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClaimResource;
use App\Models\Claim;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClaimController extends Controller
{
    public function show(Request $request, Claim $claim): JsonResponse
    {
        $this->authorize('view', $claim);

        $claim->load(['events', 'estimates.items', 'settlement']);

        return (new ClaimResource($claim))->response();
    }
}
