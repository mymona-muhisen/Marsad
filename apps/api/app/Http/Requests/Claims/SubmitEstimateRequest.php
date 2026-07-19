<?php

namespace App\Http\Requests\Claims;

use App\Enums\DamageEstimateType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitEstimateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
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
