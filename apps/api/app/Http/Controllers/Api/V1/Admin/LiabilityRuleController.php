<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PublishLiabilityRuleRequest;
use App\Http\Resources\LiabilityRuleResource;
use App\Services\Admin\LiabilityRuleAdminService;
use Illuminate\Http\JsonResponse;

class LiabilityRuleController extends Controller
{
    public function __construct(private readonly LiabilityRuleAdminService $rules) {}

    /**
     * Publish a new version of a scenario's rule. There is no update or delete
     * endpoint by design — see the service.
     */
    public function store(PublishLiabilityRuleRequest $request): JsonResponse
    {
        $rule = $this->rules->publish(
            $request->user(),
            $request->validated('scenario_code'),
            [
                'description_ar' => $request->validated('description_ar'),
                'fault_split_a' => (int) $request->validated('fault_split_a'),
                'fault_split_b' => (int) $request->validated('fault_split_b'),
                'effective_from' => $request->validated('effective_from'),
            ],
        );

        return (new LiabilityRuleResource($rule))->response()->setStatusCode(201);
    }
}
