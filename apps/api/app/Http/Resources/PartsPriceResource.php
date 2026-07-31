<?php

namespace App\Http\Resources;

use App\Models\PartsPrice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PartsPrice
 */
class PartsPriceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'part_code' => $this->part_code,
            'name_ar' => $this->name_ar,
            'reference_price' => $this->reference_price,
            // Surfaced so the client can show which revision it is quoting
            // against — reference data is versioned, never updated in place.
            'version' => $this->version,
            'effective_from' => $this->effective_from,
        ];
    }
}
