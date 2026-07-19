<?php

namespace App\Exceptions;

use App\Enums\CaseStatus;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvalidTransitionException extends Exception
{
    public function __construct(private readonly CaseStatus $from, private readonly CaseStatus $to)
    {
        parent::__construct("Cannot transition case from [{$from->value}] to [{$to->value}].");
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'from' => $this->from->value,
            'to' => $this->to->value,
        ], 422);
    }
}
