<?php

namespace App\Http\Resources;

use App\Models\Settlement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Settlement
 */
class SettlementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mode' => $this->mode,
            'amount' => $this->amount,
            'workshop_org_id' => $this->workshop_org_id,
            'settled_at' => $this->settled_at,
        ];
    }
}
