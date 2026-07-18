<?php

namespace App\Models;

use App\Enums\ObjectionStatus;
use Database\Factories\ObjectionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Objection extends Model
{
    /** @use HasFactory<ObjectionFactory> */
    use HasFactory;

    protected $fillable = [
        'decision_id',
        'party_id',
        'reason',
        'status',
        'reviewed_by',
        'resolution_note',
        'resolved_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ObjectionStatus::class,
            'resolved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<FaultDecision, $this>
     */
    public function decision(): BelongsTo
    {
        return $this->belongsTo(FaultDecision::class, 'decision_id');
    }

    /**
     * @return BelongsTo<CaseParty, $this>
     */
    public function party(): BelongsTo
    {
        return $this->belongsTo(CaseParty::class, 'party_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
