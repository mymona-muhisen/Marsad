<?php

namespace App\Http\Resources;

use App\Models\AccidentCase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AccidentCase
 */
class CaseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'case_no' => $this->case_no,
            'status' => $this->status,
            'track' => $this->track,
            'channel' => $this->channel,
            'occurred_at' => $this->occurred_at,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'location_verified' => $this->location_verified,
            'location_description' => $this->location_description,
            'region' => $this->region,
            'injury_flag' => $this->injury_flag,
            'police_report_ref' => $this->police_report_ref,
            'one_sided_flag' => $this->one_sided_flag,
            'parties' => CasePartyResource::collection($this->whenLoaded('parties')),
            'fault_decision' => new FaultDecisionResource($this->whenLoaded('faultDecision')),
            // Only the report_no and issue date — the PDF itself is fetched
            // through its own signed route, never linked by storage path.
            'reports' => $this->whenLoaded('reports', fn () => $this->reports->map(fn ($report) => [
                'report_no' => $report->report_no,
                'status' => $report->status,
                'issued_at' => $report->issued_at,
                'qr_token' => $report->qr_token,
            ])),
            'claims' => $this->whenLoaded('claims', fn () => $this->claims->map(fn ($claim) => [
                'id' => $claim->id,
                'claimant_party_id' => $claim->claimant_party_id,
                'status' => $claim->status,
                'sla_due_at' => $claim->sla_due_at,
                'opened_at' => $claim->created_at,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
