<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class PublishLiabilityRuleRequest extends FormRequest
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
            'scenario_code' => ['required', 'string', 'max:30'],
            'description_ar' => ['required', 'string', 'max:500'],
            'fault_split_a' => ['required', 'integer', 'between:0,100'],
            'fault_split_b' => ['required', 'integer', 'between:0,100'],
            // Future-dating is the point: a matrix change is announced, not
            // applied retroactively to decisions already pinned to a version.
            'effective_from' => ['required', 'date'],
        ];
    }
}
