/**
 * Boot-time enrollment hydration + auth-state watcher.
 *
 * Depends on `vl-auth` so the auth store is hydrated before we look at
 * `isAuthenticated`. Runs on both server and client; the SSR pre-fetch
 * means an authed page load has the dashboard's data ready by the time
 * the page renders, which avoids a no-data flash on hydrate.
 *
 * The watcher runs unconditionally so a logout/login cycle in the same
 * session re-hydrates without a hard reload.
 */
export default defineNuxtPlugin({
  name: 'enrollments',
  dependsOn: ['vl-auth'],
  async setup() {
    const authStore = useAuthStore()
    const enrollmentsStore = useEnrollmentsStore()

    if (authStore.isAuthenticated) {
      await enrollmentsStore.init()
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
