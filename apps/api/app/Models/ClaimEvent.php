<?php

namespace App\Models;

use Database\Factories\ClaimEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only claim timeline (doc 04 §2.5). `actor_id` is nullable — see
 * DECISIONS.md — for genuinely system-generated events (auto-open, SLA
 * breach flagging).
 */
class ClaimEvent extends Model
{
    /** @use HasFactory<ClaimEventFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'claim_id',
        'actor_id',
        'action',
        'reason_code',
        'note',
    ];

    /**
     * @return BelongsTo<Claim, $this>
     */
    public function claim(): BelongsTo
    {
        return $this->belongsTo(Claim::class, 'claim_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
