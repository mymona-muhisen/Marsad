<?php

namespace App\Services\Auth;

use App\Models\User;

class SessionService
{
    /**
     * Revokes only the token that authenticated the current request, so
     * signing out on one device leaves the user's other devices signed in.
     *
     * Only reachable behind `auth:sanctum`, and every authenticated route in
     * this API uses bearer tokens — so the current access token is always a
     * real PersonalAccessToken row. Sanctum's cookie/session TransientToken
     * (which has nothing to delete) never reaches here.
     */
    public function revokeCurrentToken(User $user): void
    {
        $user->currentAccessToken()->delete();
    }
}
