<?php

namespace App\Services\Claims;

use App\Enums\ClaimStatus;
use App\Enums\DamageEstimateStatus;
use App\Enums\DamageEstimateType;
use App\Models\Claim;
use App\Models\DamageEstimate;
use App\Models\EstimateItem;
use App\Models\PartsPrice;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * FR-CL3. The client never submits a total — it's always computed here from
 * items, which is doc 04 G10's "recalculated server-side and asserted"
 * satisfied by construction rather than a separate check.
 */
class DamageEstimateService
{
    public function __construct(private readonly ClaimTimelineService $timeline) {}

    /**
     * @param  list<array{description: string, part_code: string|null, qty: int, unit_price: float, labor_hours: float|null}>  $items
     */
    public function submit(Claim $claim, User $submitter, ?int $orgId, DamageEstimateType $type, array $items): DamageEstimate
    {
        return DB::transaction(function () use ($claim, $submitter, $orgId, $type, $items) {
            $estimate = DamageEstimate::create([
                'claim_id' => $claim->id,
                'submitted_by' => $submitter->id,
                'org_id' => $orgId,
                'type' => $type,
                'status' => DamageEstimateStatus::Submitted,
                'total' => 0,
            ]);

            $total = 0;

            foreach ($items as $item) {
                $partPrice = $item['part_code'] !== null ? $this->currentPartPrice($item['part_code']) : null;
                $lineTotal = $item['qty'] * $item['unit_price'];

                EstimateItem::create([
                    'estimate_id' => $estimate->id,
                    'part_price_id' => $partPrice?->id,
                    'description' => $item['description'],
                    'qty' => $item['qty'],
                    'unit_price' => $item['unit_price'],
                    'labor_hours' => $item['labor_hours'] ?? null,
                    'line_total' => $lineTotal,
                    'deviation_flag' => $this->exceedsDeviationThreshold($partPrice, $item['unit_price']),
                ]);

                $total += $lineTotal;
            }

            $estimate->forceFill(['total' => $total])->save();

            if (in_array($claim->status, [ClaimStatus::Opened, ClaimStatus::InfoRequested], true)) {
                $claim->forceFill(['status' => ClaimStatus::Assessing])->save();
                $this->timeline->log($claim, $submitter, 'estimate_submitted');
            }

            return $estimate->load('items');
        });
    }

    private function currentPartPrice(string $partCode): ?PartsPrice
    {
        return PartsPrice::query()
            ->where('part_code', $partCode)
            ->where('effective_from', '<=', now()->toDateString())
            ->orderByDesc('effective_from')
            ->orderByDesc('version')
            ->first();
    }

    private function exceedsDeviationThreshold(?PartsPrice $partPrice, float $unitPrice): bool
    {
        if (! $partPrice) {
            return false;
        }

        $reference = (float) $partPrice->reference_price;

        if ($reference <= 0) {
            return false;
        }

        $deviationPercent = abs($unitPrice - $reference) / $reference * 100;

        return $deviationPercent > (float) config('claims.deviation_threshold_percent');
    }
}
