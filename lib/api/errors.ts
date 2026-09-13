/** Machine-readable error codes. Never expose stack traces or SQL to clients. */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  VARIANT_NOT_FOUND: 'VARIANT_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  RETAILER_NOT_FOUND: 'RETAILER_NOT_FOUND',
  ALERT_NOT_FOUND: 'ALERT_NOT_FOUND',
  FAVORITE_NOT_FOUND: 'FAVORITE_NOT_FOUND',
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: unknown

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function notFound(what: string, code: ErrorCode = ERROR_CODES.NOT_FOUND) {
  return new AppError(code, `${what} not found.`, 404)
}
