<?php

namespace App\Http\Controllers\Api\V1\Assessor;

use App\Http\Controllers\Controller;
use App\Http\Resources\PartsPriceResource;
use App\Services\Claims\PartsPriceService;
use Illuminate\Http\JsonResponse;

class PartsPriceController extends Controller
{
    public function __construct(private readonly PartsPriceService $prices) {}

    /**
     * The reference price list an estimate is measured against.
     *
     * Previously invisible: `DamageEstimateService` flags any line deviating
     * more than `claims.deviation_threshold_percent` from these figures, so an
     * assessor was being judged against a list they could not read. Returned
     * whole — it is reference data of a few dozen rows that the estimate form
     * needs in full to offer a part picker.
     */
    public function index(): JsonResponse
    {
        return PartsPriceResource::collection($this->prices->current())->response();
    }
}
