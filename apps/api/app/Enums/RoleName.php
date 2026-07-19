<?php

namespace App\Enums;

/**
 * The 13 roles from doc 01 §B.4. Not a DB CHECK-constrained column (spatie
 * stores roles as free-text rows) — this enum exists only to keep role
 * names as typed constants instead of scattered string literals.
 */
enum RoleName: string
{
    case Citizen = 'citizen';
    case Surveyor = 'surveyor';
    case Adjudicator = 'adjudicator';
    case SeniorAdjudicator = 'senior_adjudicator';
    case InsurerAgent = 'insurer_agent';
    case InsurerAdmin = 'insurer_admin';
    case Assessor = 'assessor';
    case Workshop = 'workshop';
    case Regulator = 'regulator';
    case Authority = 'authority';
    case CallCenter = 'call_center';
    case Admin = 'admin';
    case SuperAdmin = 'super_admin';
}
