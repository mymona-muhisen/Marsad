<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\User;

class AccidentCasePolicy
{
    /**
     * Parties to the case, the reviewers whose job is to read it, and the
     * surveyor sent to it.
     *
     * Adjudication is back-office review of someone else's accident, so the
     * party check alone locked the adjudication queue out of every case it
     * lists — `GET /cases/{case}` answered 403 for the one role that has to
     * open them. The two adjudicator roles therefore hold a blanket read.
     *
     * A surveyor does not: their grant is scoped to a case they actually hold
     * a dispatch on. Being sent to one accident is no reason to be able to read
     * every other one. An insurer still reaches cases only through the claim.
     */
    public function view(User $user, AccidentCase $case): bool
    {
        if ($case->parties()->where('user_id', $user->id)->exists()) {
            return true;
        }

        if ($user->hasAnyRole([
            RoleName::Adjudicator->value,
            RoleName::SeniorAdjudicator->value,
        ])) {
            return true;
        }

        return $user->hasRole(RoleName::Surveyor->value)
            && $case->dispatches()->where('surveyor_id', $user->id)->exists();
    }
}
