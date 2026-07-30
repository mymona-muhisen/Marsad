<?php

namespace App\Services\Auth;

use App\Contracts\SmsGateway;
use App\Enums\RoleName;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OtpService
{
    public function __construct(private readonly SmsGateway $smsGateway) {}

    public function requestOtp(string $phone, ?string $fullName): void
    {
        $code = (string) random_int(0, 999999);
        $code = str_pad($code, 6, '0', STR_PAD_LEFT);

        OtpCode::create([
            'phone' => $phone,
            'code_hash' => Hash::make($code),
            'full_name' => $fullName,
            'attempts' => 0,
            'expires_at' => now()->addMinutes((int) config('otp.ttl_minutes')),
            'consumed_at' => null,
        ]);

        $this->smsGateway->send($phone, "رمز التحقق الخاص بك في مرصد هو: {$code}");
    }

    /**
     * @return array{user: User, token: string}
     */
    public function verifyOtp(string $phone, string $code): array
    {
        $otp = OtpCode::where('phone', $phone)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if (! $otp) {
            throw ValidationException::withMessages([
                'code' => ['لم يتم العثور على رمز تحقق صالح لهذا الرقم.'],
            ]);
        }

        if ($otp->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => ['انتهت صلاحية رمز التحقق.'],
            ]);
        }

        if ($otp->attempts >= (int) config('otp.max_attempts')) {
            throw ValidationException::withMessages([
                'code' => ['تم تجاوز عدد المحاولات المسموح به.'],
            ]);
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');

            throw ValidationException::withMessages([
                'code' => ['رمز التحقق غير صحيح.'],
            ]);
        }

        $otp->forceFill(['consumed_at' => now()])->save();

        $user = User::where('phone', $phone)->first();

        if (! $user) {
            $user = User::create([
                'full_name' => $otp->full_name,
                'phone' => $phone,
                'password' => Hash::make(Str::random(40)),
                'phone_verified_at' => now(),
            ]);
            $user->assignRole(RoleName::Citizen->value);
        } elseif (! $user->phone_verified_at) {
            $user->forceFill(['phone_verified_at' => now()])->save();
        }

        $token = $user->createToken('otp-verify')->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }
}
