<?php

namespace App\Models;

use Database\Factories\LiabilityRuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Versioned reference data (doc 04 §2.4): new version rows, never updated
 * in place — every historical decision reconstructs exactly via rule_id.
 */
class LiabilityRule extends Model
{
    /** @use HasFactory<LiabilityRuleFactory> */
    use HasFactory;

    protected $fillable = [
        'scenario_code',
        'description_ar',
        'fault_split_a',
        'fault_split_b',
        'version',
        'effective_from',
        'effective_to',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }
}
