<?php

namespace App\Enums;

enum ReportStatus: string
{
    case Active = 'active';
    case Superseded = 'superseded';
}
