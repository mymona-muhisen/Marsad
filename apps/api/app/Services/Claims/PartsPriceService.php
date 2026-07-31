<?php

namespace App\Services\Claims;

use App\Models\PartsPrice;
use Illuminate\Database\Eloquent\Collection;

class PartsPriceService
{
    /**
     * The in-force version of every part.
     *
     * Mirrors `DamageEstimateService::currentPartPrice()` exactly — highest
     * `effective_from`, then highest `version`, ignoring future-dated rows. If
     * the two ever disagree, the form would price against one revision while
     * the deviation flag judged it against another.
     *
     * @return Collection<int, PartsPrice>
     */
    public function current(): Collection
    {
        return PartsPrice::query()
            ->where('effective_from', '<=', now()->toDateString())
            ->orderBy('part_code')
            ->orderByDesc('effective_from')
            ->orderByDesc('version')
            ->get()
            ->unique('part_code')
            ->values();
    }
}
