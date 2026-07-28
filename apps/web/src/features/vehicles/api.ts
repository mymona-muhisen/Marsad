import { apiFetch } from '@/lib/api/client'
import type { Paginated, Vehicle } from '@/lib/api/types'

export type VehicleInput = {
  plate_no: string
  make: string
  model: string
  vin?: string
  year?: number
  color?: string
}

export function fetchVehicles(): Promise<Paginated<Vehicle>> {
  return apiFetch<Paginated<Vehicle>>('vehicles', {
    query: { per_page: 100 },
  })
}

export function createVehicle(input: VehicleInput): Promise<{ data: Vehicle }> {
  return apiFetch<{ data: Vehicle }>('vehicles', {
    method: 'POST',
    body: input,
  })
}

export const vehiclesQueryKey = ['vehicles'] as const
