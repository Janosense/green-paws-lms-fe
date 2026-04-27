/**
 * Named route middleware: gate a page behind authentication.
 * Usage:  definePageMeta({ middleware: ['auth'] })
 *
 * Pure routing — depends on the auth store hydrated by the boot plugin.
 * Unauthenticated callers are bounced to /login with the original path
 * preserved as `?redirect=` for post-login return.
 */
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated) {
    return
  }

  const target = `/login?redirect=${encodeURIComponent(to.fullPath)}`
  return navigateTo(target)
})
