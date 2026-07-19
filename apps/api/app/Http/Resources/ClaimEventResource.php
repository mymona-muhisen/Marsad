<?php

namespace App\Http\Resources;

use App\Models\ClaimEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ClaimEvent
 */
class ClaimEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'actor_id' => $this->actor_id,
            'action' => $this->action,
            'reason_code' => $this->reason_code,
            'note' => $this->note,
            'created_at' => $this->created_at,
        ];
    }
}
