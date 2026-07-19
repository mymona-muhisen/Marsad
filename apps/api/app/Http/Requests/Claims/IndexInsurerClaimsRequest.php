<?php

namespace App\Http\Requests\Claims;

use App\Enums\ClaimStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexInsurerClaimsRequest extends FormRequest
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
            'status' => ['nullable', Rule::enum(ClaimStatus::class)],
            'sla_breached' => ['nullable', 'boolean'],
        ];
    }
}
