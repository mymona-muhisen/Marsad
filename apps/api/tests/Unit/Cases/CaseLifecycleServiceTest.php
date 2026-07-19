<?php

namespace Tests\Unit\Cases;

use App\Enums\CaseStatus;
use App\Exceptions\InvalidTransitionException;
use App\Models\AccidentCase;
use App\Services\Cases\CaseLifecycleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * FR-C4 / doc 04 §2.3: exhaustively verifies every ordered pair in the
 * 12-state machine — both the allowed transitions and every forbidden one.
 */
class CaseLifecycleServiceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var array<string, list<string>>
     */
    private const ALLOWED = [
        'draft' => ['submitted', 'cancelled'],
        'submitted' => ['under_review', 'cancelled'],
        'under_review' => ['awaiting_counterparty', 'evidence_complete', 'escalated', 'cancelled'],
        'awaiting_counterparty' => ['evidence_complete', 'escalated', 'cancelled'],
        'evidence_complete' => ['adjudication', 'escalated'],
        'adjudication' => ['decision_issued', 'escalated'],
        'decision_issued' => ['objection_window'],
        'objection_window' => ['final', 'escalated'],
        'final' => ['closed'],
        'closed' => [],
        'cancelled' => [],
        'escalated' => ['under_review', 'awaiting_counterparty', 'evidence_complete', 'cancelled'],
    ];

    public function test_full_transition_matrix_allowed_and_forbidden(): void
    {
        $service = $this->app->make(CaseLifecycleService::class);

        foreach (CaseStatus::cases() as $from) {
            foreach (CaseStatus::cases() as $to) {
                $case = AccidentCase::factory()->create(['status' => $from->value]);
                $isAllowed = in_array($to->value, self::ALLOWED[$from->value], true);

                if ($isAllowed) {
                    $result = $service->transition($case, $to);
                    $this->assertSame(
                        $to,
                        $result->status,
                        "Expected {$from->value} -> {$to->value} to succeed.",
                    );

                    continue;
                }

                try {
                    $service->transition($case, $to);
                    $this->fail("Expected {$from->value} -> {$to->value} to be rejected.");
                } catch (InvalidTransitionException) {
                    $this->assertDatabaseHas('accident_cases', [
                        'id' => $case->id,
                        'status' => $from->value,
                    ]);
                }
            }
        }
    }
}
