<?php

namespace App\Http\Requests\Cases;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCaseRequest extends FormRequest
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
            'vehicle_id' => [
                'required',
                'integer',
                Rule::exists('vehicles', 'id')->where('owner_id', $this->user()?->id),
            ],
            'occurred_at' => ['required', 'date', 'before_or_equal:now'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'location_verified' => ['boolean'],
            'injury_flag' => ['required', 'boolean'],
            'statement' => ['nullable', 'string', 'max:2000', 'required_without:voice_statement'],
            'voice_statement' => ['nullable', 'file', 'mimes:mp3,wav,m4a,ogg', 'max:10240', 'required_without:statement'],
            'photos' => ['required', 'array', 'min:4'],
            'photos.*' => ['file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'hit_and_run' => ['boolean'],
            'counterparty_vehicle_id' => ['nullable', 'integer', 'exists:vehicles,id'],
            'counterparty_plate' => ['nullable', 'string', 'max:20'],
            'counterparty_phone' => ['nullable', 'string', 'regex:/^09\d{8}$/', 'required_if:hit_and_run,false'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $hitAndRun = (bool) $this->input('hit_and_run', false);

            if (! $hitAndRun && ! $this->filled('counterparty_phone') && ! $this->filled('counterparty_vehicle_id')) {
                $validator->errors()->add('counterparty_phone', 'يجب إدخال رقم هاتف الطرف الآخر أو تحديد مركبته المسجلة.');
            }
        });
    }
}
