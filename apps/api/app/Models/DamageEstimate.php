<?php

namespace App\Models;

use App\Enums\DamageEstimateStatus;
use App\Enums\DamageEstimateType;
use Database\Factories\DamageEstimateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DamageEstimate extends Model
{
    /** @use HasFactory<DamageEstimateFactory> */
    use HasFactory;

    protected $fillable = [
        'claim_id',
        'submitted_by',
        'org_id',
        'type',
        'status',
        'total',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => DamageEstimateType::class,
            'status' => DamageEstimateStatus::class,
            'total' => 'decimal:2',
        ];
    }

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
    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function org(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    /**
     * @return HasMany<EstimateItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(EstimateItem::class, 'estimate_id');
    }
}
