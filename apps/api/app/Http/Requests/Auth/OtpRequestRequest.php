<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OtpRequestRequest extends FormRequest
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
        $isNewPhone = ! User::where('phone', $this->input('phone'))->exists();

        return [
            'phone' => ['required', 'string', 'regex:/^09\d{8}$/'],
            'full_name' => [Rule::requiredIf($isNewPhone), 'nullable', 'string', 'max:120'],
        ];
    }
}
