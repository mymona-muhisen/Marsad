<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Auth\SessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Session lifecycle for an already-issued Sanctum token.
 *
 * The OTP flow issues tokens; this controller lets a client restore a session
 * on reload (`me`) and drop it (`logout`) without re-running the OTP flow.
 */
class SessionController extends Controller
{
    public function __construct(private readonly SessionService $sessions) {}

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return (new UserResource($user))->response();
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->sessions->revokeCurrentToken($user);

        return response()->json(['message' => 'تم تسجيل الخروج.']);
    }
}
