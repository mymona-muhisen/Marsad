<?php

namespace App\Services\Organization;

use App\Enums\OrganizationType;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Collection;

class WorkshopService
{
    /**
     * Accredited repair workshops (doc 01 §B.4 — the insurer admin's
     * "accredited workshop list").
     *
     * Only `active` rows: a settlement issues a repair order to whichever
     * workshop is chosen here, so a suspended one must not be selectable.
     *
     * @return Collection<int, Organization>
     */
    public function accredited(): Collection
    {
        return Organization::query()
            ->where('type', OrganizationType::Workshop->value)
            ->where('status', 'active')
            ->orderBy('name_ar')
            ->get();
    }
}
