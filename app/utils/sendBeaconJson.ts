/**
 * Send a JSON payload via `navigator.sendBeacon` with the JWT smuggled in the
 * body under `__bearer`. `sendBeacon` does not let us set request headers, so
 * the access token rides with the payload. The backend's `RestAuthenticator`
 * is expected to fall back to reading `__bearer` when no Authorization header
 * is present.
 *
 * NOTE: 5.5 ships without backend support for this fallback — production
 * `unload` events will silently 401 until that lands. This is acceptable
 * because the next `view_start` on the user's next visit reconciles state.
 * Tracked as 5.5 carry-over.
 */
export function sendBeaconJson(path: string, body: unknown): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false
  }

  const config = useRuntimeConfig()
  const base = String(config.public.wpApiBase ?? '')
  const url = `${base.replace(/\/$/, '')}${path}`

  const authStore = useAuthStore()
  const token = authStore.accessToken?.value ?? null

  const payload = JSON.stringify({
    ...(body as Record<string, unknown>),
    __bearer: token
  })
  const blob = new Blob([payload], { type: 'application/json' })

  return navigator.sendBeacon(url, blob)
}
