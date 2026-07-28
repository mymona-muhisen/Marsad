import { apiFetch, apiFetchResource } from '@/lib/api/client'
import type {
  MessageResponse,
  OtpVerifyResponse,
  User,
} from '@/lib/api/types'

export type OtpRequestInput = {
  phone: string
  /** Required only the first time a phone number is seen (backend decides). */
  full_name?: string
}

export function requestOtp(input: OtpRequestInput): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('auth/otp/request', {
    method: 'POST',
    body: input,
    anonymous: true,
  })
}

export function verifyOtp(input: {
  phone: string
  code: string
}): Promise<OtpVerifyResponse> {
  // The verify response nests the user under `user`, not Laravel's `data`
  // envelope, so this deliberately uses apiFetch rather than apiFetchResource.
  return apiFetch<OtpVerifyResponse>('auth/otp/verify', {
    method: 'POST',
    body: input,
    anonymous: true,
  })
}

export function fetchMe(): Promise<User> {
  return apiFetchResource<User>('auth/me')
}

export function logoutRequest(): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('auth/logout', { method: 'POST' })
}
