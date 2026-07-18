<?php

namespace App\Http\Resources;

use App\Models\DamageEstimate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DamageEstimate
 */
class DamageEstimateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'claim_id' => $this->claim_id,
            'type' => $this->type,
            'status' => $this->status,
            'total' => $this->total,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'part_price_id' => $item->part_price_id,
                'description' => $item->description,
                'qty' => $item->qty,
                'unit_price' => $item->unit_price,
                'labor_hours' => $item->labor_hours,
                'line_total' => $item->line_total,
                'deviation_flag' => $item->deviation_flag,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
