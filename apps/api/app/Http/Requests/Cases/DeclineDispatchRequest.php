<?php

namespace App\Http\Requests\Cases;

use App\Models\Dispatch;
use Illuminate\Foundation\Http\FormRequest;

class DeclineDispatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Dispatch $dispatch */
        $dispatch = $this->route('dispatch');

        return $this->user()?->can('decline', $dispatch) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:255'],
        ];
    }
}
