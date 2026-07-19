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
            'region' => $this->region,
            'injury_flag' => $this->injury_flag,
            'police_report_ref' => $this->police_report_ref,
            'one_sided_flag' => $this->one_sided_flag,
            'parties' => CasePartyResource::collection($this->whenLoaded('parties')),
            'created_at' => $this->created_at,
        ];
    }
}
