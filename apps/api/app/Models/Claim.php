<?php

namespace App\Models;

use App\Enums\ClaimStatus;
use Database\Factories\ClaimFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property ClaimStatus $status
 * @property Carbon $sla_due_at
 */
class Claim extends Model
{
    /** @use HasFactory<ClaimFactory> */
    use HasFactory;

    protected $fillable = [
        'case_id',
        'claimant_party_id',
        'insurer_org_id',
        'status',
        'sla_due_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ClaimStatus::class,
            'sla_due_at' => 'datetime',
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
     * @return BelongsTo<CaseParty, $this>
     */
    public function claimantParty(): BelongsTo
    {
        return $this->belongsTo(CaseParty::class, 'claimant_party_id');
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function insurer(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'insurer_org_id');
    }

    /**
     * @return HasMany<ClaimEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(ClaimEvent::class, 'claim_id');
    }

    /**
     * @return HasMany<DamageEstimate, $this>
     */
    public function estimates(): HasMany
    {
        return $this->hasMany(DamageEstimate::class, 'claim_id');
    }

    /**
     * @return HasOne<Settlement, $this>
     */
    public function settlement(): HasOne
    {
        return $this->hasOne(Settlement::class, 'claim_id');
    }
}
