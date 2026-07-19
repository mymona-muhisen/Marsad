<?php

namespace App\Http\Requests\Policy;

use App\Enums\PolicyType;
use App\Models\Vehicle;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Vehicle $vehicle */
        $vehicle = $this->route('vehicle');

        return $this->user()?->can('attachPolicy', $vehicle) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'insurer_org_id' => ['required', 'integer', 'exists:organizations,id'],
            'policy_no' => ['required', 'string', 'max:50'],
            'type' => ['required', Rule::enum(PolicyType::class)],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ];
    }
}
