<?php

namespace App\Events;

use App\Models\AccidentCase;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CaseFinalized
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly AccidentCase $case) {}
}
