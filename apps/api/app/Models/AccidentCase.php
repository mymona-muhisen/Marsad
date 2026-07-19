<?php

namespace App\Models;

use App\Enums\CaseChannel;
use App\Enums\CaseStatus;
use App\Enums\CaseTrack;
use Database\Factories\AccidentCaseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $occurred_at
 * @property CaseStatus $status
 * @property CaseChannel $channel
 * @property CaseTrack|null $track
 */
class AccidentCase extends Model
{
    /** @use HasFactory<AccidentCaseFactory> */
    use HasFactory;

    protected $fillable = [
        'case_no',
        'reported_by',
        'channel',
        'status',
        'track',
        'occurred_at',
        'lat',
        'lng',
        'location_verified',
        'region',
        'injury_flag',
        'police_report_ref',
        'one_sided_flag',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channel' => CaseChannel::class,
            'status' => CaseStatus::class,
            'track' => CaseTrack::class,
            'occurred_at' => 'datetime',
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'location_verified' => 'boolean',
            'injury_flag' => 'boolean',
            'one_sided_flag' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'case_no';
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * @return HasMany<CaseParty, $this>
     */
    public function parties(): HasMany
    {
        return $this->hasMany(CaseParty::class, 'case_id');
    }

    /**
     * @return HasMany<EvidenceItem, $this>
     */
    public function evidenceItems(): HasMany
    {
        return $this->hasMany(EvidenceItem::class, 'case_id');
    }

    /**
     * @return HasMany<Dispatch, $this>
     */
    public function dispatches(): HasMany
    {
        return $this->hasMany(Dispatch::class, 'case_id');
    }

    /**
     * @return HasMany<FraudFlag, $this>
     */
    public function fraudFlags(): HasMany
    {
        return $this->hasMany(FraudFlag::class, 'case_id');
    }

    /**
     * @return HasOne<FaultDecision, $this>
     */
    public function faultDecision(): HasOne
    {
        return $this->hasOne(FaultDecision::class, 'case_id');
    }

    /**
     * @return HasMany<Report, $this>
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'case_id');
    }
}
