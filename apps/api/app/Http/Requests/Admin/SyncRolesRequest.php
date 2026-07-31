<?php

namespace App\Http\Requests\Admin;

use App\Enums\RoleName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncRolesRequest extends FormRequest
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
            // An empty array is valid: stripping every role is how an account
            // is deactivated short of deleting it.
            'roles' => ['present', 'array'],
            'roles.*' => [Rule::enum(RoleName::class)],
        ];
    }
}
