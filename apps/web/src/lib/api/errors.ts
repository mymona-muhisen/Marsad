/** Laravel's JSON error envelope. */
export type ApiErrorBody = {
  message?: string
  errors?: Record<string, string[]>
}

/**
 * Every non-2xx response becomes one of these, so callers branch on status
 * semantics rather than re-parsing response bodies at each call site.
 */
export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>
  /** Seconds until the caller may retry — present on 429 only. */
  readonly retryAfter: number | null

  constructor(
    status: number,
    message: string,
    errors: Record<string, string[]> = {},
    retryAfter: number | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.retryAfter = retryAfter
  }

  /** The token is missing, expired, or was revoked by a sign-out elsewhere. */
  get isUnauthenticated(): boolean {
    return this.status === 401
  }

  /** Authenticated, but the role/policy check failed. */
  get isForbidden(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  /** FormRequest validation failure — `errors` is populated. */
  get isValidation(): boolean {
    return this.status === 422
  }

  get isRateLimited(): boolean {
    return this.status === 429
  }

  /**
   * A network failure or a server that never answered. Distinguished from a
   * real HTTP status so offline UX can say "no connection" rather than
   * "something went wrong".
   */
  get isOffline(): boolean {
    return this.status === 0
  }

  /** First validation message for a field, ready to hand to react-hook-form. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }

  /** Field names that failed validation. */
  get invalidFields(): string[] {
    return Object.keys(this.errors)
  }
}
