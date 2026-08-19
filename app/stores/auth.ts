import { defineStore } from 'pinia'
import type { ApiEnvelope } from '#shared/types/api'
import type {
  AccessToken,
  AuthStatus,
  ConfirmPasswordResetPayload,
  GenericMessageResponse,
  LoginCredentials,
  RegisterPayload,
  RequestPasswordResetPayload,
  ResendVerificationPayload,
  RevokeOtherSessionsResponse,
  SessionsResponse,
  TokenResponse,
  User,
  VerifyEmailPayload
} from '#shared/types/auth'

interface JwtClaims {
  exp?: number
}

/**
 * Decode a JWT payload and return the unix-second `exp` claim. Returns 0
 * when the token cannot be parsed — callers must treat that as "expired".
 * No signature validation; the server is the source of truth for validity.
 */
function decodeJwtExpiry(token: string): number {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) {
    return 0
  }
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
    // `atob` is a global in both modern browsers and Node 16+ — Nuxt's lib
    // pulls it in via lib.dom; no Buffer fallback required.
    const json = atob(padded + padding)
    const claims = JSON.parse(json) as JwtClaims
    return typeof claims.exp === 'number' ? claims.exp : 0
  } catch {
    return 0
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<AccessToken | null>(null)
  const status = ref<AuthStatus>('idle')
  // In-flight refresh promise — concurrent callers await the same promise
  // so a flurry of 401s only triggers one /vl-auth/v1/refresh round-trip.
  const refreshInflight = ref<Promise<void> | null>(null)

  const isAuthenticated = computed(() => status.value === 'authenticated' && user.value !== null)
  const isHydrated = computed(() => status.value !== 'idle' && status.value !== 'loading')

  function hasRole(role: string): boolean {
    return user.value?.roles.includes(role) ?? false
  }

  function applyTokenResponse(payload: TokenResponse): void {
    accessToken.value = {
      value: payload.access_token,
      expires_at: decodeJwtExpiry(payload.access_token)
    }
    user.value = payload.user
    status.value = 'authenticated'
  }

  function clearAuthState(): void {
    accessToken.value = null
    user.value = null
    status.value = 'unauthenticated'
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    const api = useApi()
    const response = await api.post<ApiEnvelope<TokenResponse>>(
      '/vl-auth/v1/token',
      credentials,
      { auth: false, credentials: 'include' }
    )
    applyTokenResponse(response.data)
  }

  async function register(payload: RegisterPayload): Promise<GenericMessageResponse> {
    const api = useApi()
    const response = await api.post<ApiEnvelope<GenericMessageResponse>>(
      '/vl/v1/auth/register',
      payload,
      { auth: false }
    )
    return response.data
  }

  async function fetchMe(): Promise<User> {
    const api = useApi()
    // `authRedirect: false`: fired fire-and-forget from the boot plugin, so
    // a raced token expiry here must not redirect the user to /login.
    const response = await api.get<ApiEnvelope<User>>(
      '/vl-auth/v1/me',
      { authRedirect: false }
    )
    user.value = response.data
    return response.data
  }

  async function performRefresh(): Promise<void> {
    const api = useApi()
    try {
      const response = await api.post<ApiEnvelope<TokenResponse>>(
        '/vl-auth/v1/token/refresh',
        undefined,
        { auth: false, credentials: 'include' }
      )
      applyTokenResponse(response.data)
    } catch (error) {
      clearAuthState()
      throw error
    }
  }

  /**
   * Single-flight refresh. Concurrent callers receive the same promise so
   * exactly one /token/refresh request fires per refresh cycle.
   */
  function refresh(): Promise<void> {
    if (refreshInflight.value) {
      return refreshInflight.value
    }
    const promise = performRefresh().finally(() => {
      refreshInflight.value = null
    })
    refreshInflight.value = promise
    return promise
  }

  async function logout(): Promise<void> {
    const api = useApi()
    try {
      await api.post<ApiEnvelope<{ logged_out: true }>>(
        '/vl-auth/v1/logout',
        undefined,
        { credentials: 'include' }
      )
    } catch {
      // Best-effort revocation: even if the server call fails (network error,
      // already-expired refresh cookie), we still clear local state below.
    } finally {
      clearAuthState()
    }
  }

  async function verifyEmail(payload: VerifyEmailPayload): Promise<void> {
    const api = useApi()
    const response = await api.post<ApiEnvelope<TokenResponse>>(
      '/vl/v1/auth/verify-email',
      payload,
      { auth: false, credentials: 'include' }
    )
    applyTokenResponse(response.data)
  }

  async function resendVerification(payload: ResendVerificationPayload): Promise<GenericMessageResponse> {
    const api = useApi()
    const response = await api.post<ApiEnvelope<GenericMessageResponse>>(
      '/vl/v1/auth/resend-verification',
      payload,
      { auth: false }
    )
    return response.data
  }

  async function requestPasswordReset(payload: RequestPasswordResetPayload): Promise<GenericMessageResponse> {
    const api = useApi()
    const response = await api.post<ApiEnvelope<GenericMessageResponse>>(
      '/vl/v1/auth/request-password-reset',
      payload,
      { auth: false }
    )
    return response.data
  }

  async function confirmPasswordReset(payload: ConfirmPasswordResetPayload): Promise<GenericMessageResponse> {
    const api = useApi()
    const response = await api.post<ApiEnvelope<GenericMessageResponse>>(
      '/vl/v1/auth/reset-password',
      payload,
      { auth: false }
    )
    return response.data
  }

  async function listSessions(): Promise<SessionsResponse> {
    const api = useApi()
    const response = await api.get<ApiEnvelope<SessionsResponse>>('/vl-auth/v1/sessions')
    return response.data
  }

  async function revokeSession(id: number): Promise<void> {
    const api = useApi()
    await api.delete<ApiEnvelope<{ revoked: true }>>(`/vl-auth/v1/sessions/${id}`)
  }

  async function revokeOtherSessions(): Promise<RevokeOtherSessionsResponse> {
    const api = useApi()
    const response = await api.delete<ApiEnvelope<RevokeOtherSessionsResponse>>(
      '/vl-auth/v1/sessions',
      { credentials: 'include' }
    )
    return response.data
  }

  return {
    // state
    user,
    accessToken,
    status,
    refreshInflight,
    // getters
    isAuthenticated,
    isHydrated,
    // utilities
    hasRole,
    clearAuthState,
    // actions
    login,
    register,
    logout,
    refresh,
    fetchMe,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    confirmPasswordReset,
    listSessions,
    revokeSession,
    revokeOtherSessions
  }
})
