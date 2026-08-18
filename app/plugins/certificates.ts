/**
 * Boot-time certificates hydration + auth-state watcher.
 *
 * Mirrors `app/plugins/enrollments.ts` exactly: fire-and-forget prefetch
 * (kept off the app-mount critical path), single-flight dedupe with any
 * page-level `await init()`, and an unconditional auth watcher.
 *
 * @author Tymofii Synianskyi
 */
export default defineNuxtPlugin({
  name: 'vl-certificates',
  dependsOn: ['vl-auth'],
  setup() {
    const authStore = useAuthStore()
    const certificatesStore = useCertificatesStore()

    if (authStore.isAuthenticated) {
      void certificatesStore.init()
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
