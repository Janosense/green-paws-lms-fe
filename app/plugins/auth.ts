/**
 * Boot-time auth hydration. Runs on both server and client. Route middleware
 * always runs after plugins, so this plugin's effects are visible to auth.ts
 * and guest.ts without any explicit ordering hint beyond `dependsOn: ['pinia']`
 * (which guarantees the Pinia plugin has installed before we touch the store —
 * `enforce: 'pre'` here would actually make it run *before* Pinia and crash).
 *
 * Flow:
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
