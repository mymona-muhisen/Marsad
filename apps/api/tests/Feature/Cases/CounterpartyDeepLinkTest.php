<?php

namespace Tests\Feature\Cases;

use App\Contracts\SmsGateway;
use App\Models\User;
use App\Models\Vehicle;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Doubles\FakeSmsGateway;
use Tests\Support\FakesPhotos;
use Tests\TestCase;

/**
 * The link the counterparty actually receives.
 *
 * Nothing asserted the host before, which is how it went unnoticed that the
 * message was built from APP_URL — the API's own address, where `/join/{token}`
 * is not a route. The recipient would have opened a 404.
 */
class CounterpartyDeepLinkTest extends TestCase
{
    use FakesPhotos, RefreshDatabase;

    private FakeSmsGateway $sms;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->sms = new FakeSmsGateway;
        $this->app->instance(SmsGateway::class, $this->sms);
        $this->seed(RoleSeeder::class);
    }

    private function reportCase(): void
    {
        $reporter = User::factory()->create(['phone' => '0911111111']);
        $vehicle = Vehicle::factory()->create(['owner_id' => $reporter->id]);

        $this->actingAs($reporter)->postJson('/api/v1/cases', [
            'vehicle_id' => $vehicle->id,
            'occurred_at' => now()->subMinutes(20)->toISOString(),
            'lat' => 33.5138,
            'lng' => 36.2765,
            'injury_flag' => false,
            'statement' => 'اصطدمت بي المركبة من الخلف.',
            'photos' => $this->fourPhotos('r'),
            'counterparty_phone' => '0922222222',
        ])->assertCreated();
    }

    public function test_the_join_link_points_at_the_frontend_not_the_api(): void
    {
        config(['app.frontend_url' => 'https://marsad.example']);
        config(['app.url' => 'https://api.marsad.example']);

        $this->reportCase();

        $message = $this->sms->lastMessage();

        $this->assertNotNull($message);
        $this->assertStringContainsString('https://marsad.example/join/', $message);
        $this->assertStringNotContainsString('api.marsad.example', $message);
    }

    public function test_a_trailing_slash_does_not_produce_a_double_slash(): void
    {
        config(['app.frontend_url' => 'https://marsad.example/']);

        $this->reportCase();

        $this->assertStringNotContainsString('//join/', (string) $this->sms->lastMessage());
    }

    public function test_the_link_carries_the_token_the_teaser_endpoint_accepts(): void
    {
        config(['app.frontend_url' => 'https://marsad.example']);

        $this->reportCase();

        // Pull the token straight out of the SMS and use it — this is the
        // recipient's whole journey, end to end.
        preg_match('#/join/([A-Za-z0-9]+)#', (string) $this->sms->lastMessage(), $matches);
        $this->assertNotEmpty($matches[1] ?? null);

        $this->getJson("/api/v1/cases/join/{$matches[1]}")
            ->assertOk()
            ->assertJsonStructure(['data' => ['case_no', 'occurred_at', 'region']]);
    }
}
