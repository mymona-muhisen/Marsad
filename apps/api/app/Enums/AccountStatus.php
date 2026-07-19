<?php

namespace App\Enums;

/**
 * Shared status values for `users.status` and `organizations.status`
 * (doc 04 §2.1 — both tables use the identical active/suspended set).
 */
enum AccountStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';
}
