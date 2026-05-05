/**
 * Named route middleware: gate `learn/*` pages behind authentication, with
 * an instructor preview bypass.
 *
 * Default behaviour mirrors `auth.ts` — unauthenticated callers are
 * redirected to `/login?return_to=...`. When the URL carries `?preview=1`
 * AND the signed-in user holds the `instructor` or `veterinarian` role,
 * any subsequent enrollment-gate redirect is suppressed: previewers walk
 * through the course as if enrolled, and the backend's `LessonAccessGate`
 * already short-circuits for users with `edit_post` capability.
 */
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    if (to.path === '/login') return
    return navigateTo(`/login?return_to=${encodeURIComponent(to.fullPath)}`)
  }

  const isPreview = to.query.preview === '1'
  if (isPreview) {
    const roles = authStore.user?.roles ?? []
    if (roles.includes('instructor') || roles.includes('veterinarian')) {
      return
    }
  }
})
