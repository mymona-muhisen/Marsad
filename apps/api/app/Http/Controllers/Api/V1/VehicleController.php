<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vehicle\StoreVehicleRequest;
use App\Http\Requests\Vehicle\UpdateVehicleRequest;
use App\Http\Resources\VehicleResource;
use App\Models\Vehicle;
use App\Services\Vehicle\VehicleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function __construct(private readonly VehicleService $vehicles) {}

    public function index(Request $request): JsonResponse
    {
        $vehicles = $this->vehicles->forUser($request->user())->get();

        return VehicleResource::collection($vehicles)->response();
    }

    public function store(StoreVehicleRequest $request): JsonResponse
    {
        $vehicle = $this->vehicles->create($request->user(), $request->validated());

        return (new VehicleResource($vehicle))->response()->setStatusCode(201);
    }

    public function show(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorize('view', $vehicle);

        return (new VehicleResource($vehicle))->response();
    }

    public function update(UpdateVehicleRequest $request, Vehicle $vehicle): JsonResponse
    {
        $vehicle = $this->vehicles->update($vehicle, $request->validated());

        return (new VehicleResource($vehicle))->response();
    }

    public function destroy(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorize('delete', $vehicle);

        $this->vehicles->delete($vehicle);

        return response()->json(null, 204);
    }

    public function restore(Request $request, int $vehicle): JsonResponse
    {
        $trashedVehicle = $this->vehicles->findTrashedOrFail($vehicle);

        $this->authorize('restore', $trashedVehicle);

        $restored = $this->vehicles->restore($trashedVehicle);

        return (new VehicleResource($restored))->response();
    }
}
