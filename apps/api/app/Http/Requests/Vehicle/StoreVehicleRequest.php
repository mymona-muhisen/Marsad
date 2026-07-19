<?php

namespace App\Http\Requests\Vehicle;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVehicleRequest extends FormRequest
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
            'plate_no' => ['required', 'string', 'max:20'],
            'vin' => ['nullable', 'string', 'max:30', Rule::unique('vehicles', 'vin')],
            'make' => ['required', 'string', 'max:50'],
            'model' => ['required', 'string', 'max:50'],
            'year' => ['nullable', 'integer', 'between:1950,2030'],
            'color' => ['nullable', 'string', 'max:30'],
        ];
    }
}
