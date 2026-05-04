/**
 * Boot-time webinar-registration hydration + auth-state watcher.
 *
 * Mirrors `app/plugins/enrollments.ts`. SSR-friendly (the watcher attaches
 * regardless of side); the SSR pre-fetch keeps the dashboard's data ready
 * by hydration so the list does not flash empty on cold loads.
 */
export default defineNuxtPlugin({
  name: 'vl-webinar-registrations',
  dependsOn: ['vl-auth'],
  async setup() {
    const authStore = useAuthStore()
    const store = useWebinarRegistrationsStore()

    if (authStore.isAuthenticated) {
      await store.init()
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
