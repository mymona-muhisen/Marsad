<?php

namespace Database\Factories;

use App\Models\DamageEstimate;
use App\Models\EstimateItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EstimateItem>
 */
class EstimateItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $qty = fake()->numberBetween(1, 3);
        $unitPrice = fake()->numberBetween(50000, 500000);

        return [
            'estimate_id' => DamageEstimate::factory(),
            'part_price_id' => null,
            'description' => fake()->words(3, true),
            'qty' => $qty,
            'unit_price' => $unitPrice,
            'labor_hours' => null,
            'line_total' => $qty * $unitPrice,
            'deviation_flag' => false,
        ];
    }
}
