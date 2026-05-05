import type { OrderCreationResponse, OrderEntityType, PreparedPayment } from '#shared/types/order'
import { resolveOrderError } from '~/utils/resolveOrderError'

/**
 * Phase 8.4 — checkout composable.
 *
 * Wraps the orders store's `createOrder` with toast + redirect handling for
 * the two known idempotent edge cases (`already_enrolled`, `already_registered`)
 * and exposes a DOM-mutation helper to submit the LiqPay-signed form. The
 * composable is the seam between the checkout page (UI flow) and the
 * orders store (state); the page never touches `useApi` or the DOM directly.
 *
 * @author Tymofii Synianskyi
 */
export function useCheckout() {
  const ordersStore = useOrdersStore()
  const toast = useToast()
  const { t } = useI18n()

  /**
   * Create-or-resume an order for the given entity. Surfaces a toast and
   * navigates to the relevant dashboard on `already_enrolled` /
   * `already_registered`; otherwise toasts and re-throws so the caller can
   * keep its own loading state in sync.
   */
  async function createOrder(
    entityType: OrderEntityType,
    slug: string
  ): Promise<OrderCreationResponse> {
    try {
      return await ordersStore.createOrder(entityType, slug)
    } catch (caught) {
      const resolved = resolveOrderError(caught)

      if (resolved.code === 'already_enrolled') {
        toast.add({
          title: t(resolved.key),
          color: 'info',
          icon: 'i-lucide-info'
        })
        await navigateTo('/dashboard')
        throw caught
      }
      if (resolved.code === 'already_registered') {
        toast.add({
          title: t(resolved.key),
          color: 'info',
          icon: 'i-lucide-info'
        })
        await navigateTo('/dashboard/webinars')
        throw caught
      }

      toast.add({
        title: t('common.error_title'),
        description: t(resolved.key),
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      throw caught
    }
  }

  /**
   * Build a hidden `<form>` with the signed LiqPay payload and submit it.
   * The browser navigates away immediately, so no cleanup is necessary —
   * the form lives only until the unload event fires.
   *
   * Throws if called from the server: form submission is a client-only
   * operation. Pages should `if (import.meta.client)` gate the call.
   */
  function submitPaymentForm(payment: PreparedPayment): void {
    if (!import.meta.client) {
      throw new Error('submitPaymentForm must be called client-side')
    }

    const form = document.createElement('form')
    form.method = payment.http_method
    form.action = payment.action_url
    form.style.display = 'none'

    for (const [key, value] of Object.entries(payment.fields)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value
      form.appendChild(input)
    }

    document.body.appendChild(form)
    form.submit()
  }

  /**
   * Convenience delegate to the store's polling action — the result page
   * uses this so the composable surface is one cohesive API.
   */
  function pollOrderStatus(uuid: string) {
    return ordersStore.pollUntilTerminal(uuid)
  }

  return { createOrder, submitPaymentForm, pollOrderStatus }
}
