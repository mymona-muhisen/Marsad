<?php

namespace Tests\Feature\Fault;

use App\Enums\ReportStatus;
use App\Models\Report;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportVerifyTest extends TestCase
{
    use RefreshDatabase;

    public function test_verify_returns_only_minimal_authenticity_data(): void
    {
        $report = Report::factory()->create();

        $response = $this->getJson("/api/v1/reports/verify/{$report->qr_token}");

        $response->assertOk()->assertExactJson([
            'data' => [
                'report_no' => $report->report_no,
                'issued_at' => $report->issued_at->toJSON(),
                'status' => ReportStatus::Active->value,
                'superseded_by' => null,
            ],
        ]);
    }

    public function test_unknown_token_returns_no_such_report(): void
    {
        $this->getJson('/api/v1/reports/verify/00000000-0000-0000-0000-000000000000')
            ->assertNotFound()
            ->assertJsonPath('message', 'No such report.');
    }

    public function test_superseded_report_points_to_the_superseding_report_number(): void
    {
        $newReport = Report::factory()->create();
        $oldReport = Report::factory()->create([
            'case_id' => $newReport->case_id,
            'status' => ReportStatus::Superseded->value,
            'superseded_by' => $newReport->id,
        ]);

        $response = $this->getJson("/api/v1/reports/verify/{$oldReport->qr_token}");

        $response->assertOk()->assertJsonPath('data.superseded_by', $newReport->report_no);
    }
}
