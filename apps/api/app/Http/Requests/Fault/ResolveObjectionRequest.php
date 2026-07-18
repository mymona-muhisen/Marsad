<?php

namespace App\Http\Requests\Fault;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResolveObjectionRequest extends FormRequest
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
            'outcome' => ['required', Rule::in(['uphold', 'dismiss'])],
            'resolution_note' => ['required', 'string', 'max:2000'],
            'amended_allocations' => ['required_if:outcome,uphold', 'array'],
            'amended_allocations.*.party_id' => ['required_with:amended_allocations', 'integer', 'exists:case_parties,id'],
            'amended_allocations.*.percentage' => ['required_with:amended_allocations', 'integer', 'between:0,100'],
        ];
    }
}
