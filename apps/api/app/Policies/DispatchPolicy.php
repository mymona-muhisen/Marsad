<?php

namespace App\Policies;

use App\Models\Dispatch;
use App\Models\User;

class DispatchPolicy
{
    public function view(User $user, Dispatch $dispatch): bool
    {
        return $user->id === $dispatch->surveyor_id;
    }

    public function accept(User $user, Dispatch $dispatch): bool
    {
        return $user->id === $dispatch->surveyor_id;
    }

    public function decline(User $user, Dispatch $dispatch): bool
    {
        return $user->id === $dispatch->surveyor_id;
    }

    public function markOnScene(User $user, Dispatch $dispatch): bool
    {
        return $user->id === $dispatch->surveyor_id;
    }

    public function complete(User $user, Dispatch $dispatch): bool
    {
        return $user->id === $dispatch->surveyor_id;
    }
}
