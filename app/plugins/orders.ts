/**
 * Boot-time orders hydration + auth-state watcher.
 *
 * Mirrors `app/plugins/certificates.ts` exactly. Depends on `vl-auth` so the
 * auth store is hydrated before we look at `isAuthenticated`. The boot
 * prefetch keeps the dashboard `/dashboard/orders` list ready for instant
 * render once the user clicks the sidebar entry.
 *
 * @author Tymofii Synianskyi
 */
export default defineNuxtPlugin({
  name: 'vl-orders',
  dependsOn: ['vl-auth'],
  async setup() {
    const authStore = useAuthStore()
    const ordersStore = useOrdersStore()

    if (authStore.isAuthenticated) {
      await ordersStore.init()
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
