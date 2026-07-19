<?php

namespace App\Http\Requests\Fault;

use App\Models\AccidentCase;
use Illuminate\Foundation\Http\FormRequest;

class SubmitObjectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var AccidentCase $case */
        $case = $this->route('case');

        return $this->user()?->can('view', $case) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:2000'],
        ];
    }
}
