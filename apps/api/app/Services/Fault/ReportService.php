<?php

namespace App\Services\Fault;

use App\Enums\ReportStatus;
use App\Models\AccidentCase;
use App\Models\Report;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * FR-F4: signed, Arabic RTL PDF report. Any active report for the case is
 * superseded when a new one is generated (appeal-amendment path) — see
 * DECISIONS.md for why `reports.case_id` isn't a strict UQ here.
 */
class ReportService
{
    public function generate(AccidentCase $case): Report
    {
        $case->loadMissing(['parties', 'faultDecision.allocations.party', 'faultDecision.rule']);

        $pdfContent = Pdf::loadView('reports.fault-report', [
            'case' => $case,
            'decision' => $case->faultDecision,
        ])->output();

        $reportNo = $this->generateReportNo();
        $path = "reports/{$reportNo}.pdf";

        Storage::disk('public')->put($path, $pdfContent);

        $previousActive = Report::query()
            ->where('case_id', $case->id)
            ->where('status', ReportStatus::Active->value)
            ->first();

        $report = Report::create([
            'case_id' => $case->id,
            'report_no' => $reportNo,
            'pdf_path' => $path,
            'qr_token' => (string) Str::uuid(),
            'signed_hash' => hash('sha256', $pdfContent),
            'status' => ReportStatus::Active,
            'issued_at' => now(),
        ]);

        if ($previousActive) {
            $previousActive->forceFill([
                'status' => ReportStatus::Superseded,
                'superseded_by' => $report->id,
            ])->save();
        }

        return $report;
    }

    public function findByQrToken(string $qrToken): ?Report
    {
        return Report::where('qr_token', $qrToken)->first();
    }

    private function generateReportNo(): string
    {
        do {
            $candidate = 'RPT-'.now()->format('y').'-'.strtoupper(Str::random(7));
        } while (Report::where('report_no', $candidate)->exists());

        return $candidate;
    }
}
