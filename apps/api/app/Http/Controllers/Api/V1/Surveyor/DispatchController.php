<?php

namespace App\Http\Controllers\Api\V1\Surveyor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cases\CompleteDispatchRequest;
use App\Http\Requests\Cases\DeclineDispatchRequest;
use App\Http\Resources\DispatchResource;
use App\Models\Dispatch;
use App\Services\Cases\DispatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DispatchController extends Controller
{
    public function __construct(private readonly DispatchService $dispatches) {}

    public function index(Request $request): JsonResponse
    {
        $dispatches = $this->dispatches->forSurveyor($request->user())->get();

        return DispatchResource::collection($dispatches)->response();
    }

    public function accept(Request $request, Dispatch $dispatch): JsonResponse
    {
        $this->authorize('accept', $dispatch);

        $dispatch = $this->dispatches->accept($dispatch);

        return (new DispatchResource($dispatch))->response();
    }

    public function decline(DeclineDispatchRequest $request, Dispatch $dispatch): JsonResponse
    {
        $dispatch = $this->dispatches->decline($dispatch, $request->validated('reason'));

        return (new DispatchResource($dispatch))->response();
    }

    public function markOnScene(Request $request, Dispatch $dispatch): JsonResponse
    {
        $this->authorize('markOnScene', $dispatch);

        $dispatch = $this->dispatches->markOnScene($dispatch);

        return (new DispatchResource($dispatch))->response();
    }

    public function complete(CompleteDispatchRequest $request, Dispatch $dispatch): JsonResponse
    {
        $dispatch = $this->dispatches->complete(
            $dispatch,
            $request->user(),
            $request->file('photos', []),
            $request->input('photo_keys', []),
        );

        return (new DispatchResource($dispatch))->response();
    }
}
