<?php

namespace App\Http\Controllers\Api\V1\Adjudication;

use App\Http\Controllers\Controller;
use App\Http\Resources\LiabilityRuleResource;
use App\Services\Fault\LiabilityRuleService;
use Illuminate\Http\JsonResponse;

class LiabilityRuleController extends Controller
{
    public function __construct(private readonly LiabilityRuleService $rules) {}

    /**
     * The liability matrix backing the console's proposal card.
     *
     * Returned whole rather than paginated: it is reference data of a dozen
     * rows that the decision form needs in full to offer a scenario picker.
     */
    public function index(): JsonResponse
    {
        return LiabilityRuleResource::collection($this->rules->current())->response();
    }
}
