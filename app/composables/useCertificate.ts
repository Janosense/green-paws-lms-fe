import type { ApiError } from '#shared/types/api'
import type { CertificateDetail } from '#shared/types/certificate'

/**
 * Phase 6.4 — thin façade over `useCertificatesStore` for the detail page.
 *
 * On creation: kicks off a `fetchDetail()` if the uuid isn't already in
 * the detail cache. Returns reactive accessors plus a `refresh()` that
 * forces a re-fetch (used by the "Спробувати ще" CTA on errors).
 *
 * @author Tymofii Synianskyi
 */
export function useCertificate(uuid: MaybeRefOrGetter<string>) {
  const store = useCertificatesStore()

  const isLoading = ref(false)
  const error = ref<ApiError | null>(null)

  const detail = computed<CertificateDetail | null>(() =>
    store.getDetail(toValue(uuid))
  )

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      await store.fetchDetail(toValue(uuid))
    } catch (caught) {
      error.value = caught as ApiError
    } finally {
      isLoading.value = false
    }
  }

  async function refresh(): Promise<void> {
    await load()
  }

  watch(
    () => toValue(uuid),
    (next, prev) => {
      if (!next || next === prev) return
      if (!store.getDetail(next)) {
        void load()
      }
    },
    { immediate: true }
  )

  return {
    detail,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    refresh
  }
}
