/**
 * Named route middleware: keep guest-only pages (login, register,
 * password-reset) away from authenticated users.
 * Usage:  definePageMeta({ middleware: ['guest'] })
 *
 * The redirect target is `/account` once 2.E ships that page; it falls
 * through to `/` until then.
 */
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    return
  }

  return navigateTo('/account')
})
