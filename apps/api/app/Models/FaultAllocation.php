<?php

namespace App\Models;

use Database\Factories\FaultAllocationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaultAllocation extends Model
{
    /** @use HasFactory<FaultAllocationFactory> */
    use HasFactory;

    protected $fillable = [
        'decision_id',
        'party_id',
        'percentage',
    ];

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
}
