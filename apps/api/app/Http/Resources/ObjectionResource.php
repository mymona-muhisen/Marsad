<?php

namespace App\Http\Resources;

use App\Models\Objection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Objection
 */
class ObjectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'decision_id' => $this->decision_id,
            'party_id' => $this->party_id,
            'reason' => $this->reason,
            'status' => $this->status,
            'resolution_note' => $this->resolution_note,
            'resolved_at' => $this->resolved_at,
        ];
    }
}
