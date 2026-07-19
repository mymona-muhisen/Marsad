<?php

namespace App\Models;

use Database\Factories\FraudFlagFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only fraud signal log (Sprint 3 addition — see DECISIONS.md).
 */
class FraudFlag extends Model
{
    /** @use HasFactory<FraudFlagFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'case_id',
        'evidence_item_id',
        'matched_evidence_item_id',
        'reason',
    ];

    /**
     * @return BelongsTo<AccidentCase, $this>
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(AccidentCase::class, 'case_id');
    }

    /**
     * @return BelongsTo<EvidenceItem, $this>
     */
    public function evidenceItem(): BelongsTo
    {
        return $this->belongsTo(EvidenceItem::class);
    }

    /**
     * @return BelongsTo<EvidenceItem, $this>
     */
    public function matchedEvidenceItem(): BelongsTo
    {
        return $this->belongsTo(EvidenceItem::class);
    }
}
