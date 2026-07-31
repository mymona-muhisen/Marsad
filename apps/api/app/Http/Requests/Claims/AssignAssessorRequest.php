<?php

namespace App\Http\Requests\Claims;

use App\Enums\OrganizationType;
use App\Models\Claim;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignAssessorRequest extends FormRequest
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
            // Null clears the assignment — a desk assessment by the insurer's
            // own staff has no external office on it.
            'assessor_org_id' => [
                'nullable',
                'integer',
                Rule::exists('organizations', 'id')
                    // Only an accreditation that can actually price damage, and
                    // only an active one.
                    ->whereIn('type', [
                        OrganizationType::AssessorOffice->value,
                        OrganizationType::Workshop->value,
                    ])
                    ->where('status', 'active'),
            ],
        ];
    }
}
