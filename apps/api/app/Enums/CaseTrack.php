<?php

namespace App\Enums;

enum CaseTrack: string
{
    case FastTrack = 'fast_track';
    case DispatchRequired = 'dispatch_required';
    case PoliceRequired = 'police_required';
}
