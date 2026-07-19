<?php

namespace App\Models;

use Database\Factories\EstimateItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstimateItem extends Model
{
    /** @use HasFactory<EstimateItemFactory> */
    use HasFactory;

    protected $fillable = [
        'estimate_id',
        'part_price_id',
        'description',
        'qty',
        'unit_price',
        'labor_hours',
        'line_total',
        'deviation_flag',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'labor_hours' => 'decimal:2',
            'line_total' => 'decimal:2',
            'deviation_flag' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<DamageEstimate, $this>
     */
    public function estimate(): BelongsTo
    {
        return $this->belongsTo(DamageEstimate::class, 'estimate_id');
    }

    /**
     * @return BelongsTo<PartsPrice, $this>
     */
    public function partPrice(): BelongsTo
    {
        return $this->belongsTo(PartsPrice::class, 'part_price_id');
    }
}
