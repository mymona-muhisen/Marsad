<?php

namespace App\Http\Requests\Fault;

use Illuminate\Foundation\Http\FormRequest;

class DecideFaultRequest extends FormRequest
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
            'scenario_code' => ['nullable', 'string', 'max:30'],
            'allocations' => ['required', 'array', 'min:1'],
            'allocations.*.party_id' => ['required', 'integer', 'exists:case_parties,id'],
            'allocations.*.percentage' => ['required', 'integer', 'between:0,100'],
            'justification' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
