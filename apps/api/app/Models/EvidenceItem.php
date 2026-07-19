<?php

namespace App\Models;

use App\Enums\EvidenceType;
use Database\Factories\EvidenceItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $captured_at
 * @property EvidenceType $type
 *
 * Append-only (CLAUDE.md rule #3): no update/delete routes exist for this
 * model — corrections happen via a new row + `superseded_by` on the old one.
 */
class EvidenceItem extends Model
{
    /** @use HasFactory<EvidenceItemFactory> */
    use HasFactory;

    protected $fillable = [
        'case_id',
        'party_id',
        'uploaded_by',
        'type',
        'file_path',
        'sha256',
        'idempotency_key',
        'lat',
        'lng',
        'captured_at',
        'superseded_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => EvidenceType::class,
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'captured_at' => 'datetime',
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
    public function party(): BelongsTo
    {
        return $this->belongsTo(CaseParty::class, 'party_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * @return BelongsTo<EvidenceItem, $this>
     */
    public function supersededByItem(): BelongsTo
    {
        return $this->belongsTo(EvidenceItem::class, 'superseded_by');
    }
}
