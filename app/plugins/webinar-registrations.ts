/**
 * Boot-time webinar-registration hydration + auth-state watcher.
 *
 * Mirrors `app/plugins/enrollments.ts`: fire-and-forget prefetch (kept off
 * the app-mount critical path), single-flight dedupe with any page-level
 * `await init()`, and an unconditional auth watcher.
 */
export default defineNuxtPlugin({
  name: 'vl-webinar-registrations',
  dependsOn: ['vl-auth'],
  setup() {
    const authStore = useAuthStore()
    const store = useWebinarRegistrationsStore()

    if (authStore.isAuthenticated) {
      void store.init()
    }

    watch(
      () => authStore.isAuthenticated,
      (isAuthed, wasAuthed) => {
        if (isAuthed && !wasAuthed) {
          void store.refresh()
        } else if (!isAuthed && wasAuthed) {
          store.clear()
        }
      }
    )
  }
})
