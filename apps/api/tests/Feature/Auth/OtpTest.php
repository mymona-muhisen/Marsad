<?php

namespace Tests\Feature\Auth;

use App\Contracts\SmsGateway;
use App\Models\OtpCode;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Doubles\FakeSmsGateway;
use Tests\TestCase;

class OtpTest extends TestCase
{
    use RefreshDatabase;

    private FakeSmsGateway $sms;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sms = new FakeSmsGateway;
        $this->app->instance(SmsGateway::class, $this->sms);

        $this->seed(RoleSeeder::class);
    }

    public function test_new_citizen_can_request_and_verify_otp(): void
    {
        $this->postJson('/api/v1/auth/otp/request', [
            'phone' => '0911111111',
            'full_name' => 'محمد أحمد',
        ])->assertOk();

        $code = $this->sms->lastCode();
        $this->assertNotNull($code);

        $verify = $this->postJson('/api/v1/auth/otp/verify', [
            'phone' => '0911111111',
            'code' => $code,
        ]);

        $verify->assertOk()->assertJsonStructure([
            'user' => ['id', 'full_name', 'phone', 'locale', 'status', 'organization_id', 'roles'],
            'token',
        ]);

        $this->assertDatabaseHas('users', ['phone' => '0911111111', 'full_name' => 'محمد أحمد']);

        $user = User::where('phone', '0911111111')->firstOrFail();
        $this->assertNotNull($user->phone_verified_at);
        $this->assertTrue($user->hasRole('citizen'));
    }

    public function test_existing_user_verifying_again_does_not_duplicate_the_user_row(): void
    {
        $user = User::factory()->create(['phone' => '0955555555']);

        $this->postJson('/api/v1/auth/otp/request', ['phone' => '0955555555'])->assertOk();

        $this->postJson('/api/v1/auth/otp/verify', [
            'phone' => '0955555555',
            'code' => $this->sms->lastCode(),
        ])->assertOk();

        $this->assertSame(1, User::where('phone', '0955555555')->count());
        $this->assertSame($user->id, User::where('phone', '0955555555')->firstOrFail()->id);
    }

    public function test_wrong_code_is_rejected_and_increments_attempts(): void
    {
        $this->postJson('/api/v1/auth/otp/request', [
            'phone' => '0922222222',
            'full_name' => 'Test User',
        ])->assertOk();

        $actual = $this->sms->lastCode();
        $wrong = $actual === '123456' ? '654321' : '123456';

        $this->postJson('/api/v1/auth/otp/verify', [
            'phone' => '0922222222',
            'code' => $wrong,
        ])->assertStatus(422);

        $this->assertSame(1, OtpCode::where('phone', '0922222222')->firstOrFail()->attempts);
        $this->assertDatabaseMissing('users', ['phone' => '0922222222']);
    }

    public function test_expired_code_is_rejected(): void
    {
        $this->postJson('/api/v1/auth/otp/request', [
            'phone' => '0933333333',
            'full_name' => 'Test User',
        ])->assertOk();

        $code = $this->sms->lastCode();

        OtpCode::where('phone', '0933333333')->update(['expires_at' => now()->subMinute()]);

        $this->postJson('/api/v1/auth/otp/verify', [
            'phone' => '0933333333',
            'code' => $code,
        ])->assertStatus(422);
    }

    public function test_otp_request_is_rate_limited_per_phone(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/auth/otp/request', [
                'phone' => '0944444444',
                'full_name' => 'Test User',
            ])->assertOk();
        }

        $this->postJson('/api/v1/auth/otp/request', [
            'phone' => '0944444444',
            'full_name' => 'Test User',
        ])->assertStatus(429);
    }
}
