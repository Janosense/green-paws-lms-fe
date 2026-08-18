/**
 * Boot-time orders hydration + auth-state watcher.
 *
 * Mirrors `app/plugins/certificates.ts` exactly: fire-and-forget prefetch
 * (kept off the app-mount critical path) that warms `/dashboard/orders`,
 * single-flight dedupe with any page-level `await init()`, and an
 * unconditional auth watcher.
 *
 * @author Tymofii Synianskyi
 */
export default defineNuxtPlugin({
  name: 'vl-orders',
  dependsOn: ['vl-auth'],
  setup() {
    const authStore = useAuthStore()
    const ordersStore = useOrdersStore()

    if (authStore.isAuthenticated) {
      void ordersStore.init()
    }

    watch(
      () => authStore.isAuthenticated,
      (isAuthed, wasAuthed) => {
        if (isAuthed && !wasAuthed) {
          void ordersStore.refreshList()
        } else if (!isAuthed && wasAuthed) {
          ordersStore.clear()
        }
      }
    )
  }
})
