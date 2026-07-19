<?php

namespace App\Http\Resources;

use App\Enums\ReportStatus;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * UC-07: public authenticity check — report number, issue date, validity
 * status only. Deliberately excludes names, plates, and amounts.
 *
 * @mixin Report
 */
class ReportVerifyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'report_no' => $this->report_no,
            'issued_at' => $this->issued_at,
            'status' => $this->status,
            'superseded_by' => $this->status === ReportStatus::Superseded
                ? $this->supersededByReport?->report_no
                : null,
        ];
    }
}
