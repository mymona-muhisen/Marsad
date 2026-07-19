<?php

namespace App\Http\Requests\Policy;

use App\Models\InsurancePolicy;
use Illuminate\Foundation\Http\FormRequest;

class RejectPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var InsurancePolicy $policy */
        $policy = $this->route('policy');

        return $this->user()?->can('reject', $policy) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
