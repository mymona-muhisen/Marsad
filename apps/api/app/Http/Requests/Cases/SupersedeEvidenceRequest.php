<?php

namespace App\Http\Requests\Cases;

use App\Models\EvidenceItem;
use Illuminate\Foundation\Http\FormRequest;

class SupersedeEvidenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var EvidenceItem $evidence */
        $evidence = $this->route('evidence');

        return $this->user()?->id === $evidence->uploaded_by;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,mp3,wav,m4a,ogg', 'max:10240'],
        ];
    }
}
