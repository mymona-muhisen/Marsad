<?php

namespace Tests\Feature\Hardening;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_carry_the_hardening_security_headers(): void
    {
        $response = $this->postJson('/api/v1/auth/otp/request', [
            'phone' => '0911111111',
            'full_name' => 'Test User',
        ]);

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    }
}
