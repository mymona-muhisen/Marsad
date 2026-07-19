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
        ];
    }
}
