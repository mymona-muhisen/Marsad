<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\OtpRequestRequest;
use App\Http\Requests\Auth\OtpVerifyRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\OtpService;
use Illuminate\Http\JsonResponse;

class OtpController extends Controller
{
    public function __construct(private readonly OtpService $otpService) {}

    public function request(OtpRequestRequest $request): JsonResponse
    {
        $this->otpService->requestOtp($request->string('phone')->toString(), $request->input('full_name'));

        return response()->json(['message' => 'تم إرسال رمز التحقق.']);
    }

    public function verify(OtpVerifyRequest $request): JsonResponse
    {
        $result = $this->otpService->verifyOtp(
            $request->string('phone')->toString(),
            $request->string('code')->toString(),
        );

        return response()->json([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
        ]);
    }
}
