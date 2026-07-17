<?php

namespace App\Http\Requests\Cases;

use App\Models\Dispatch;
use Illuminate\Foundation\Http\FormRequest;

class CompleteDispatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Dispatch $dispatch */
        $dispatch = $this->route('dispatch');

        return $this->user()?->can('complete', $dispatch) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'photos' => ['required', 'array', 'min:1'],
            'photos.*' => ['file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'photo_keys' => ['required', 'array', 'size:'.count($this->file('photos', []))],
            'photo_keys.*' => ['required', 'string', 'uuid'],
        ];
    }
}
