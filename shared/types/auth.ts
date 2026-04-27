/**
 * Shape returned by GET /vl-auth/v1/me and the `user` field of /token, /refresh,
 * /vl/v1/auth/verify-email. The capabilities array is only present on /me.
 * Backend reference: vl-jwt-auth/src/Api/RestController.php::user_payload().
 */
export interface User {
  id: number
  login: string
  email: string
  display_name: string
  roles: string[]
  capabilities?: string[]
  // `account_kind` is returned by /vl/v1/auth/verify-email's user payload
  // (see vl-lms AuthController::user_payload()) but NOT by /vl-auth/v1/me
  // (see vl-jwt-auth RestController::user_payload()). Frontend treats it
  // as optional: present immediately after verify-email; absent after a
  // hard refresh that re-hydrates from /me alone.
  account_kind?: string
}

/**
 * Access-token state held in the auth store. `expires_at` is a unix timestamp
 * in seconds derived from the JWT `exp` claim at receive time. Never persisted.
 */
export interface AccessToken {
  value: string
  expires_at: number
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

/**
 * Decoded JWT claims we care about. We only read `exp` to schedule expiry.
 */
export interface AccessTokenClaims {
  exp: number
  iat?: number
  user_id?: number
}

/**
 * POST /vl-auth/v1/token request body. The backend's parameter is `username`,
 * which accepts either a WP login or an email.
 */
export interface LoginCredentials {
  username: string
  password: string
}

/**
 * POST /vl-auth/v1/token success body (and same shape from /refresh).
 */
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

/**
 * POST /vl/v1/auth/register body.
 */
export interface RegisterPayload {
  email: string
  password: string
  first_name: string
  last_name: string
  account_kind?: string
}

export interface VerifyEmailPayload {
  token: string
}

export interface ResendVerificationPayload {
  email: string
}

export interface RequestPasswordResetPayload {
  email: string
}

export interface ConfirmPasswordResetPayload {
  token: string
  password: string
}

/**
 * Shape returned by GET /vl-auth/v1/sessions (per session, list under data.sessions).
 * Confirmed by Phase 2.B that `token_hash` is NEVER included.
 */
export interface Session {
  id: number
  device_name: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  last_used_at: string
  expires_at: string
  current: boolean
}

export interface SessionsResponse {
  sessions: Session[]
}

export interface RevokeOtherSessionsResponse {
  revoked_count: number
}

export interface GenericMessageResponse {
  message: string
}
