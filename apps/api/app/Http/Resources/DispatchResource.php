<?php

namespace App\Http\Resources;

use App\Models\Dispatch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Dispatch
 */
class DispatchResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'zone' => $this->zone,
            'status' => $this->status,
            'decline_reason' => $this->decline_reason,
            'assigned_at' => $this->assigned_at,
            'accepted_at' => $this->accepted_at,
            'completed_at' => $this->completed_at,
            /*
             | Where to go, and what they are walking into.
             |
             | Without this the payload carried only `case_id` — a sequential
             | id the client cannot even look the case up by, since cases are
             | addressed by `case_no`. A dispatch with no address is not a
             | dispatch.
             */
            'case' => $this->whenLoaded('case', fn () => [
                'case_no' => $this->case->case_no,
                'occurred_at' => $this->case->occurred_at,
                'region' => $this->case->region,
                'location_description' => $this->case->location_description,
                'location_verified' => $this->case->location_verified,
                'lat' => $this->case->lat,
                'lng' => $this->case->lng,
                // Surfaced deliberately: a surveyor should know before
                // arriving whether anyone was hurt.
                'injury_flag' => $this->case->injury_flag,
                'status' => $this->case->status,
            ]),
        ];
    }
}
