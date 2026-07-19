<?php

namespace App\Enums;

enum DamageEstimateType: string
{
    case Workshop = 'workshop';
    case Assessor = 'assessor';
    case Desk = 'desk';
}
