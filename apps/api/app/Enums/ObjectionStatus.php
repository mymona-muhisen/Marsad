<?php

namespace App\Enums;

enum ObjectionStatus: string
{
    case Open = 'open';
    case Upheld = 'upheld';
    case Dismissed = 'dismissed';
}
