/**
 * Boot-time certificates hydration + auth-state watcher.
 *
 * Mirrors `app/plugins/enrollments.ts` exactly. Depends on `vl-auth` so
 * the auth store is hydrated before we look at `isAuthenticated`. Runs on
 * both server and client; the SSR pre-fetch means an authed page load
 * has the certificate list ready by the time the dashboard sidebar
 * renders its nav entry.
 *
 * @author Tymofii Synianskyi
 */
export default defineNuxtPlugin({
  name: 'vl-certificates',
  dependsOn: ['vl-auth'],
  async setup() {
    const authStore = useAuthStore()
    const certificatesStore = useCertificatesStore()

    if (authStore.isAuthenticated) {
      await certificatesStore.init()
    }

    watch(
      () => authStore.isAuthenticated,
      (isAuthed, wasAuthed) => {
        if (isAuthed && !wasAuthed) {
          void certificatesStore.refresh()
        } else if (!isAuthed && wasAuthed) {
          certificatesStore.clear()
        }
      }
    )
  }
})
