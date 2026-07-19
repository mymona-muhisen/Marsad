<?php

namespace App\Policies;

use App\Models\EvidenceItem;
use App\Models\User;

class EvidenceItemPolicy
{
    public function view(User $user, EvidenceItem $evidence): bool
    {
        if ($user->id === $evidence->uploaded_by) {
            return true;
        }

        return $evidence->case->parties()->where('user_id', $user->id)->exists();
    }
}
