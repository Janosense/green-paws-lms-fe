/**
 * Boot-time enrollment hydration + auth-state watcher.
 *
 * Depends on `vl-auth` so the auth store is hydrated before we look at
 * `isAuthenticated` (which is only ever true on the client — `vl-auth`
 * returns early on SSR). The prefetch is deliberately fire-and-forget:
 * blocking app mount on it would put a WP round-trip on every authed
 * first load's critical path. Pages that need the data `await init()`
 * themselves and dedupe against this call via the store's single-flight
 * `init()` promise.
 *
 * The watcher runs unconditionally so a logout/login cycle in the same
 * session re-hydrates without a hard reload.
 */
export default defineNuxtPlugin({
  name: 'enrollments',
  dependsOn: ['vl-auth'],
  setup() {
    const authStore = useAuthStore()
    const enrollmentsStore = useEnrollmentsStore()

    if (authStore.isAuthenticated) {
      void enrollmentsStore.init()
    }

    watch(
      () => authStore.isAuthenticated,
      (isAuthed, wasAuthed) => {
        if (isAuthed && !wasAuthed) {
          void enrollmentsStore.refresh()
        } else if (!isAuthed && wasAuthed) {
          enrollmentsStore.clear()
        }
      }
    )
  }
})
