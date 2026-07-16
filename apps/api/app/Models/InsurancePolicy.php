<?php

namespace App\Models;

use App\Enums\PolicyType;
use App\Enums\VerificationStatus;
use Database\Factories\InsurancePolicyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $start_date
 * @property Carbon $end_date
 * @property Carbon|null $verified_at
 */
class InsurancePolicy extends Model
{
    /** @use HasFactory<InsurancePolicyFactory> */
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'insurer_org_id',
        'policy_no',
        'type',
        'start_date',
        'end_date',
        'verification_status',
        'verified_by',
        'verified_at',
        'document_path',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'verified_at' => 'datetime',
            'type' => PolicyType::class,
            'verification_status' => VerificationStatus::class,
        ];
    }

    /**
     * @return BelongsTo<Vehicle, $this>
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function insurer(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'insurer_org_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
