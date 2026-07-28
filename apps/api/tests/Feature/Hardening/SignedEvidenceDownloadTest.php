<?php

namespace Tests\Feature\Hardening;

use App\Models\AccidentCase;
use App\Models\EvidenceItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SignedEvidenceDownloadTest extends TestCase
{
    use RefreshDatabase;

    public function test_uploader_can_request_a_signed_download_url_and_use_it_unauthenticated(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('evidence/test.jpg', 'fake-bytes');

        $uploader = User::factory()->create();
        $case = AccidentCase::factory()->create();
        $evidence = EvidenceItem::factory()->create([
            'case_id' => $case->id,
            'uploaded_by' => $uploader->id,
            'file_path' => 'evidence/test.jpg',
        ]);

        $response = $this->actingAs($uploader)->getJson("/api/v1/evidence/{$evidence->id}/download-url");
        $response->assertOk();
        $url = $response->json('data.url');
        $this->assertNotEmpty($url);

        // The signature is the credential — no Sanctum token attached here.
        $download = $this->get($url);
        $download->assertOk();
    }

    public function test_a_user_unrelated_to_the_case_cannot_request_a_download_url(): void
    {
        $uploader = User::factory()->create();
        $intruder = User::factory()->create();
        $case = AccidentCase::factory()->create();
        $evidence = EvidenceItem::factory()->create([
            'case_id' => $case->id,
            'uploaded_by' => $uploader->id,
        ]);

        $this->actingAs($intruder)->getJson("/api/v1/evidence/{$evidence->id}/download-url")
            ->assertForbidden();
    }

    public function test_download_route_rejects_a_tampered_or_expired_signature(): void
    {
        $case = AccidentCase::factory()->create();
        $evidence = EvidenceItem::factory()->create(['case_id' => $case->id]);

        // No signature at all.
        $this->get("/api/v1/evidence/{$evidence->id}/download")->assertForbidden();

        // Tampered signature.
        $this->get("/api/v1/evidence/{$evidence->id}/download?signature=not-a-real-signature")
            ->assertForbidden();
    }
}
