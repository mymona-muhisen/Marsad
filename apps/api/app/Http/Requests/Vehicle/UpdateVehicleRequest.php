<?php

namespace App\Http\Requests\Vehicle;

use App\Models\Vehicle;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Vehicle $vehicle */
        $vehicle = $this->route('vehicle');

        return $this->user()?->can('update', $vehicle) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'vin' => ['nullable', 'string', 'max:30', Rule::unique('vehicles', 'vin')->ignore($this->route('vehicle'))],
            'make' => ['sometimes', 'required', 'string', 'max:50'],
            'model' => ['sometimes', 'required', 'string', 'max:50'],
            'year' => ['nullable', 'integer', 'between:1950,2030'],
            'color' => ['nullable', 'string', 'max:30'],
        ];
    }
}
