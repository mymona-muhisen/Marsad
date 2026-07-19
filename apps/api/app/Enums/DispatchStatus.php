<?php

namespace App\Enums;

enum DispatchStatus: string
{
    case Assigned = 'assigned';
    case Accepted = 'accepted';
    case Declined = 'declined';
    case OnScene = 'on_scene';
    case Completed = 'completed';
}
