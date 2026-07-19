<?php

namespace App\Models;

use App\Enums\CasePartyRole;
use Database\Factories\CasePartyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $joined_at
 * @property Carbon|null $join_token_expires_at
 */
class CaseParty extends Model
{
    /** @use HasFactory<CasePartyFactory> */
    use HasFactory;

    protected $fillable = [
        'case_id',
        'user_id',
        'vehicle_id',
        'policy_id',
        'role',
        'unregistered_plate',
        'unregistered_phone',
        'statement_text',
        'joined_at',
        'join_token',
        'join_token_expires_at',
    ];

    protected $hidden = [
        'join_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => CasePartyRole::class,
            'joined_at' => 'datetime',
            'join_token_expires_at' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Vehicle, $this>
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * @return BelongsTo<InsurancePolicy, $this>
     */
    public function policy(): BelongsTo
    {
        return $this->belongsTo(InsurancePolicy::class);
    }

    /**
     * @return HasMany<EvidenceItem, $this>
     */
    public function evidenceItems(): HasMany
    {
        return $this->hasMany(EvidenceItem::class, 'party_id');
    }

    /**
     * @return HasMany<Claim, $this>
     */
    public function claims(): HasMany
    {
        return $this->hasMany(Claim::class, 'claimant_party_id');
    }
}
