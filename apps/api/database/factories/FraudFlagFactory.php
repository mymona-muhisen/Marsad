<?php

namespace Database\Factories;

use App\Models\AccidentCase;
use App\Models\EvidenceItem;
use App\Models\FraudFlag;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FraudFlag>
 */
class FraudFlagFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'case_id' => AccidentCase::factory(),
            'evidence_item_id' => EvidenceItem::factory(),
            'matched_evidence_item_id' => EvidenceItem::factory(),
            'reason' => 'duplicate_photo_hash',
        ];
    }
}
