<?php

namespace App\Http\Requests\Claims;

use App\Enums\DamageEstimateType;
use App\Models\Claim;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitEstimateRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Claim $claim */
        $claim = $this->route('claim');

        // Was a bare `true`: the role middleware let any assessor through, and
        // nothing tied them to this claim. `claims.assessor_org_id` now does.
        return $this->user()?->can('estimate', $claim) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(DamageEstimateType::class)],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:150'],
            'items.*.part_code' => ['nullable', 'string', 'max:30'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.labor_hours' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
