<?php

namespace App\Models;

use App\Enums\SettlementMode;
use Database\Factories\SettlementFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Settlement extends Model
{
    /** @use HasFactory<SettlementFactory> */
    use HasFactory;

    protected $fillable = [
        'claim_id',
        'mode',
        'amount',
        'workshop_org_id',
        'settled_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mode' => SettlementMode::class,
            'amount' => 'decimal:2',
            'settled_at' => 'datetime',
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
     * @return BelongsTo<Organization, $this>
     */
    public function workshop(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'workshop_org_id');
    }
}
