<?php

namespace App\Enums;

enum FaultDecisionStatus: string
{
    case Proposed = 'proposed';
    case Confirmed = 'confirmed';
    case Objected = 'objected';
    case Final = 'final';
}
