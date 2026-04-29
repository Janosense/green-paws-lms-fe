/**
 * Auth-state watcher for the progress store.
 *
 * Mirrors `app/plugins/enrollments.ts` but does NOT prefetch on boot —
 * curriculum data is fetched lazily by the learn pages on demand, so
 * pre-emptive hydration would waste bandwidth on users who never enter
 * the player.
 */
export default defineNuxtPlugin({
  name: 'vl-progress',
  dependsOn: ['vl-auth'],
  setup() {
    const authStore = useAuthStore()
    const progressStore = useProgressStore()

    watch(
      () => authStore.isAuthenticated,
      (isAuthed, wasAuthed) => {
        if (!isAuthed && wasAuthed) {
          progressStore.clear()
        }
      }
    )
  }
})
