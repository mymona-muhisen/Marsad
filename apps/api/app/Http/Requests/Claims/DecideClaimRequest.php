<?php

namespace App\Http\Requests\Claims;

use App\Enums\ClaimDecisionOutcome;
use App\Enums\ClaimReasonCode;
use App\Models\Claim;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DecideClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Claim $claim */
        $claim = $this->route('claim');

        return $this->user()?->can('manage', $claim) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'outcome' => ['required', Rule::enum(ClaimDecisionOutcome::class)],
            'reason_code' => ['required', Rule::enum(ClaimReasonCode::class)],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
