<?php

namespace App\Http\Requests\Cases;

use Illuminate\Foundation\Http\FormRequest;

class JoinCaseRequest extends FormRequest
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
            'statement' => ['nullable', 'string', 'max:2000', 'required_without:voice_statement'],
            'voice_statement' => ['nullable', 'file', 'mimes:mp3,wav,m4a,ogg', 'max:10240', 'required_without:statement'],
            'photos' => ['required', 'array', 'min:4'],
            'photos.*' => ['file', 'mimes:jpg,jpeg,png', 'max:5120'],
        ];
    }
}
