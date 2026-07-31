<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * CLAUDE.md rule #9: observer-based audit log on privileged mutations
 * (decisions, claims decisions, role changes, reference data).
 */
class AuditLogService
{
    /**
     * @param  array<string, mixed>  $changes
     */
    public function log(User $actor, string $action, Model $entity, array $changes): void
    {
        AuditLog::create([
            'user_id' => $actor->id,
            'action' => $action,
            'entity_type' => class_basename($entity),
            'entity_id' => $entity->getKey(),
            'changes' => $changes,
        ]);
    }

    /**
     * Newest first — an audit trail is read from the most recent event back.
     *
     * @return Builder<AuditLog>
     */
    public function recent(?string $entityType = null): Builder
    {
        return AuditLog::query()
            ->with('user')
            ->when($entityType !== null, fn (Builder $q) => $q->where('entity_type', $entityType))
            ->latest('created_at')
            ->latest('id');
    }
}
