<?php

namespace App\Http\Resources;

use App\Models\CaseParty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * UC-02 step 3: shows only the accident's basic facts — deliberately NOT
 * the reporter's statement, to avoid anchoring/copying by the counterparty.
 *
 * @mixin CaseParty
 */
class CaseJoinTeaserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'case_no' => $this->case->case_no,
            'occurred_at' => $this->case->occurred_at,
            'region' => $this->case->region,
        ];
    }
}
