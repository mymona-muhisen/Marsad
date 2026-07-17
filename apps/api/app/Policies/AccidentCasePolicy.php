<?php

namespace App\Policies;

use App\Models\AccidentCase;
use App\Models\User;

class AccidentCasePolicy
{
    public function view(User $user, AccidentCase $case): bool
    {
        return $case->parties()->where('user_id', $user->id)->exists();
    }
}
