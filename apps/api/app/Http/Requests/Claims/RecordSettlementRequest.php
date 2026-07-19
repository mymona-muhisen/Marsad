<?php

namespace App\Http\Requests\Claims;

use App\Enums\SettlementMode;
use App\Models\Claim;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RecordSettlementRequest extends FormRequest
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
            'mode' => ['required', Rule::enum(SettlementMode::class)],
            'amount' => ['required', 'numeric', 'min:0'],
            'workshop_org_id' => ['required_if:mode,repair_order', 'nullable', 'integer', 'exists:organizations,id'],
        ];
    }
}
