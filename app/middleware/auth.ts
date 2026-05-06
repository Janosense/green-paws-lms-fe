/**
 * Named route middleware: gate a page behind authentication.
 * Usage:  definePageMeta({ middleware: ['auth'] })
 *
 * Pure routing — depends on the auth store hydrated by the boot plugin.
 * Unauthenticated callers are bounced to /login with the original path
 * preserved as `?return_to=` for post-login return.
 *
 * Client-only: the refresh cookie that drives auth is on a different origin
 * than the SPA, so SSR can never see it (see `plugins/auth.ts`). Redirecting
 * during SSR would 302 every authed page to /login on hard reload before the
 * browser even runs JS. Defer the gate to the client, where the boot plugin
 * has had a chance to refresh.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()

  if (authStore.isAuthenticated) {
    return
  }

  if (to.path === '/login') {
    return
  }

  const target = `/login?return_to=${encodeURIComponent(to.fullPath)}`
  return navigateTo(target)
})
