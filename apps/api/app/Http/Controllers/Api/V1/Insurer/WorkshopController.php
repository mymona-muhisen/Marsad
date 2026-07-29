<?php

namespace App\Http\Controllers\Api\V1\Insurer;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrganizationResource;
use App\Services\Organization\WorkshopService;
use Illuminate\Http\JsonResponse;

class WorkshopController extends Controller
{
    public function __construct(private readonly WorkshopService $workshops) {}

    /**
     * Backs the workshop picker on the settlement form.
     *
     * `RecordSettlementRequest` requires `workshop_org_id` when the mode is
     * `repair_order`, and there was previously no way for a client to discover
     * a valid id. Unpaginated: it is a short accreditation list.
     */
    public function index(): JsonResponse
    {
        return OrganizationResource::collection($this->workshops->accredited())->response();
    }
}
