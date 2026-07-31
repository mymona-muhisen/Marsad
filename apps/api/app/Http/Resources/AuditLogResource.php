<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuditLog
 */
class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'entity_type' => class_basename((string) $this->entity_type),
            'entity_id' => $this->entity_id,
            'changes' => $this->changes,
            'created_at' => $this->created_at,
            'actor' => $this->whenLoaded('user', fn () => [
                'full_name' => $this->user?->full_name,
                'phone' => $this->user?->phone,
            ]),
        ];
    }
}
