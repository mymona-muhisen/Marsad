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
            'location_description' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:80'],
            'injury_flag' => ['required', 'boolean'],
            'statement' => ['nullable', 'string', 'max:2000', 'required_without:voice_statement'],
            'voice_statement' => ['nullable', 'file', 'mimes:mp3,wav,m4a,ogg', 'max:10240', 'required_without:statement'],
            'photos' => ['required', 'array', 'min:4'],
            'photos.*' => ['file', 'mimes:jpg,jpeg,png', 'max:5120'],
            // Offline tolerance: a retried submit after a dropped connection
            // must return the original case, not file a second accident.
            'idempotency_key' => ['nullable', 'uuid'],
            'idempotency_keys' => ['nullable', 'array'],
            'idempotency_keys.*' => ['nullable', 'uuid'],
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

            // Without a device fix the coordinates are city-scale at best (a
            // governorate centre), which is useless to a dispatched surveyor —
            // so a written location becomes mandatory instead.
            $verified = $this->boolean('location_verified', true);

            if (! $verified && ! $this->filled('location_description')) {
                $validator->errors()->add('location_description', 'اكتب وصف موقع الحادث عند تعذّر تحديده تلقائياً.');
            }
        });
    }
}
