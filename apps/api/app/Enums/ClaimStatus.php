<?php

namespace App\Enums;

enum ClaimStatus: string
{
    case Opened = 'opened';
    case InfoRequested = 'info_requested';
    case Assessing = 'assessing';
    case Approved = 'approved';
    case PartiallyApproved = 'partially_approved';
    case Rejected = 'rejected';
    case Settled = 'settled';
    case Closed = 'closed';
}
