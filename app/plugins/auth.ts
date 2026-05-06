/**
 * Boot-time auth hydration. Client-only by design.
 *
 * The frontend SPA and the WP backend live on different origins (localhost:3001
 * vs green-paws-lms-backend.ddev.site in dev), so the HttpOnly refresh cookie
 * that vl-jwt-auth issues is scoped to the *backend* origin — it never lands
 * in the request headers Nuxt's Node server sees. Running the boot refresh on
 * SSR therefore always 401s, flips status to 'unauthenticated', and (worse)
 * tricks the auth middleware into issuing a 302 to /login before the browser
 * ever runs JS. We skip SSR entirely and let the client — which *does* see
 * the cookie — drive it.
 *
 * Flow (client only):
 *   1. status -> 'loading'
 *   2. POST /vl-auth/v1/token/refresh — succeeds when the refresh cookie is
 *      live; populates the access token + user (the response embeds `user`).
 *   3. GET /vl-auth/v1/me — refreshes the user payload and pulls in the
 *      `capabilities` array (only present on /me, not on /token /refresh).
 *   4. status -> 'authenticated' or 'unauthenticated'.
 *
 * Any unexpected error (network, 5xx, malformed response) is treated as
 * "not signed in" rather than crashing the app.
 */
export default defineNuxtPlugin({
  name: 'vl-auth',
  dependsOn: ['pinia'],
  async setup() {
    if (import.meta.server) {
      return
    }

    const authStore = useAuthStore()

    if (authStore.status !== 'idle') {
      return
    }

    authStore.status = 'loading'

    try {
      await authStore.refresh()
      await authStore.fetchMe()
    } catch {
      // refresh() already calls clearAuthState() on auth failure; calling
      // again is idempotent and covers any other failure path (e.g. fetchMe
      // 5xx after a successful refresh).
      authStore.clearAuthState()
    }
  }
})
