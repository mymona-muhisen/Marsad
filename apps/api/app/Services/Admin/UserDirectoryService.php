<?php

namespace App\Services\Admin;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class UserDirectoryService
{
    /**
     * @return Builder<User>
     */
    public function search(?string $term, ?string $role): Builder
    {
        return User::query()
            ->with('roles')
            ->when($role !== null, fn (Builder $q) => $q->role($role))
            ->when($term !== null && $term !== '', function (Builder $q) use ($term) {
                // Phone is the login identifier, so it is the field an admin
                // is most likely to be handed over the phone.
                $q->where(function (Builder $inner) use ($term) {
                    $inner->where('phone', 'like', "%{$term}%")
                        ->orWhere('full_name', 'like', "%{$term}%");
                });
            })
            ->orderBy('full_name');
    }
}
