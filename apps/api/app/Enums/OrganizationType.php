<?php

namespace App\Enums;

enum OrganizationType: string
{
    case Insurer = 'insurer';
    case Workshop = 'workshop';
    case AssessorOffice = 'assessor_office';
    case Regulator = 'regulator';
    case Authority = 'authority';
}
