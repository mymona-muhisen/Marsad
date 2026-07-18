<?php

namespace App\Models;

use App\Enums\FaultDecisionStatus;
use Database\Factories\FaultDecisionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property FaultDecisionStatus $status
 * @property Carbon $decided_at
 * @property string|null $justification
 */
class FaultDecision extends Model
{
    /** @use HasFactory<FaultDecisionFactory> */
    use HasFactory;

    protected $fillable = [
        'case_id',
        'rule_id',
        'adjudicator_id',
        'status',
        'was_overridden',
        'justification',
        'decided_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => FaultDecisionStatus::class,
            'was_overridden' => 'boolean',
            'decided_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<AccidentCase, $this>
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(AccidentCase::class, 'case_id');
    }

    /**
     * @return BelongsTo<LiabilityRule, $this>
     */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(LiabilityRule::class, 'rule_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function adjudicator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjudicator_id');
    }

    /**
     * @return HasMany<FaultAllocation, $this>
     */
    public function allocations(): HasMany
    {
        return $this->hasMany(FaultAllocation::class, 'decision_id');
    }

    /**
     * @return HasMany<Objection, $this>
     */
    public function objections(): HasMany
    {
        return $this->hasMany(Objection::class, 'decision_id');
    }
}
