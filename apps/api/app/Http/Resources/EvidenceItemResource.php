<?php

namespace App\Http\Resources;

use App\Models\EvidenceItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin EvidenceItem
 */
class EvidenceItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'party_id' => $this->party_id,
            'type' => $this->type,
            'file_path' => $this->file_path,
            'sha256' => $this->sha256,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'captured_at' => $this->captured_at,
            'superseded_by' => $this->superseded_by,
        ];
    }
}
