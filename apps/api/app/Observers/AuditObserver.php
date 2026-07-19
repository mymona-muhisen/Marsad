<?php

namespace App\Observers;

use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Attached to models whose mutations are privileged (CLAUDE.md rule #9):
 * fault decisions and claim decisions. Silently skips logging when there is
 * no authenticated actor (e.g. a system-triggered event like claim auto-open
 * or a scheduled job) — attributing those to an arbitrary user would
 * misrepresent the audit trail (see DECISIONS.md, Sprint 6, on the same
 * principle for `claim_events.actor_id`).
 */
class AuditObserver
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function created(Model $model): void
    {
        $this->log('created', $model, $model->getAttributes());
    }

    public function updated(Model $model): void
    {
        $this->log('updated', $model, $model->getChanges());
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    private function log(string $action, Model $model, array $changes): void
    {
        $actor = Auth::user();

        if (! $actor instanceof User) {
            return;
        }

        $this->auditLog->log($actor, $action, $model, $changes);
    }
}
