/**
 * Shape of a successful envelope from vl-lms REST endpoints.
 * Matches the response format defined in the backend RestController.
 */
export interface ApiEnvelope<T> {
  success: true
  data: T
}

/**
 * Normalized error shape used by useApi.
 * WordPress REST API returns errors as { code, message, data: { status } }.
 */
export interface ApiError {
  code: string
  message: string
  status: number
  data?: unknown
}

/**
 * Response from GET /vl/v1/healthz
 */
export interface HealthzResponse {
  status: 'ok'
  version: string
  timestamp: number
}
