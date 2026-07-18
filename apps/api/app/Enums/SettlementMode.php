<?php

namespace App\Enums;

enum SettlementMode: string
{
    case RepairOrder = 'repair_order';
    case Cash = 'cash';
}
