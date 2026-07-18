<?php

namespace Database\Factories;

use App\Enums\ReportStatus;
use App\Models\AccidentCase;
use App\Models\Report;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Report>
 */
class ReportFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'case_id' => AccidentCase::factory(),
            'report_no' => 'RPT-'.now()->format('y').'-'.strtoupper(Str::random(7)),
            'pdf_path' => 'reports/'.fake()->uuid().'.pdf',
            'qr_token' => (string) Str::uuid(),
            'signed_hash' => hash('sha256', fake()->uuid()),
            'status' => ReportStatus::Active->value,
            'superseded_by' => null,
            'issued_at' => now(),
        ];
    }
}
