/**
 * Named route middleware: keep guest-only pages (login, register,
 * password-reset) away from authenticated users.
 * Usage:  definePageMeta({ middleware: ['guest'] })
 *
 * Client-only for the same reason as `auth.ts`: the SSR side cannot see the
 * cross-origin refresh cookie, so it would always conclude "not authenticated"
 * and let an already-signed-in user land on /login on hard reload.
 */
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    return
  }

  return navigateTo('/account')
})
