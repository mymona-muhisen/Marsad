<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\AccidentCase;
use App\Models\User;

class AccidentCasePolicy
{
    /**
     * Parties to the case, plus the reviewers whose job is to read it.
     *
     * Adjudication is back-office review of someone else's accident, so the
     * party check alone locked the adjudication queue out of every case it
     * lists — `GET /cases/{case}` answered 403 for the one role that has to
     * open them. Deliberately limited to the two adjudicator roles: a surveyor
     * reaches their cases through the dispatch endpoints and an insurer
     * through the claim, so neither needs a blanket grant here.
     */
    public function view(User $user, AccidentCase $case): bool
    {
        if ($case->parties()->where('user_id', $user->id)->exists()) {
            return true;
        }

        return $user->hasAnyRole([
            RoleName::Adjudicator->value,
            RoleName::SeniorAdjudicator->value,
        ]);
    }
}
