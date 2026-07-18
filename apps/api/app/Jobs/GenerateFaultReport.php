<?php

namespace App\Jobs;

use App\Models\AccidentCase;
use App\Services\Fault\ReportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateFaultReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly int $caseId) {}

    public function handle(ReportService $reports): void
    {
        $reports->generate(AccidentCase::findOrFail($this->caseId));
    }
}
