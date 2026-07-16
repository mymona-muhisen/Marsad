<?php

namespace App\Services\Vehicle;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class VehicleService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(User $user, array $data): Vehicle
    {
        $trashed = Vehicle::onlyTrashed()->where('plate_no', $data['plate_no'])->first();

        if ($trashed) {
            if ($trashed->owner_id !== $user->id) {
                throw ValidationException::withMessages([
                    'plate_no' => ['رقم اللوحة مسجل مسبقاً.'],
                ]);
            }

            $trashed->restore();
            $trashed->update(array_diff_key($data, ['plate_no' => null]));

            return $trashed->refresh();
        }

        return Vehicle::create([...$data, 'owner_id' => $user->id]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Vehicle $vehicle, array $data): Vehicle
    {
        $vehicle->update($data);

        return $vehicle->refresh();
    }

    public function delete(Vehicle $vehicle): void
    {
        $vehicle->delete();
    }

    public function restore(Vehicle $vehicle): Vehicle
    {
        $vehicle->restore();

        return $vehicle->refresh();
    }

    public function findTrashedOrFail(int $id): Vehicle
    {
        return Vehicle::onlyTrashed()->findOrFail($id);
    }

    /**
     * @return Builder<Vehicle>
     */
    public function forUser(User $user): Builder
    {
        return Vehicle::query()->where('owner_id', $user->id);
    }
}
