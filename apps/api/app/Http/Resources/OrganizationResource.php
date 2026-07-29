<?php

namespace App\Http\Resources;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Identity and accreditation only. Deliberately omits contact details and
 * anything commercially sensitive — the consumers of this are pickers.
 *
 * @mixin Organization
 */
class OrganizationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'type' => $this->type,
            'license_no' => $this->license_no,
            'status' => $this->status,
        ];
    }
}
