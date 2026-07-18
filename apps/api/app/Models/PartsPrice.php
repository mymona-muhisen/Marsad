<?php

namespace App\Models;

use Database\Factories\PartsPriceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Versioned reference data (doc 04 §2.5), same pattern as liability_rules —
 * new version rows, never updated in place.
 */
class PartsPrice extends Model
{
    /** @use HasFactory<PartsPriceFactory> */
    use HasFactory;

    protected $fillable = [
        'part_code',
        'name_ar',
        'reference_price',
        'version',
        'effective_from',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reference_price' => 'decimal:2',
            'effective_from' => 'date',
        ];
    }
}
