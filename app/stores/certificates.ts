import { defineStore } from 'pinia'
import type { ApiError } from '#shared/types/api'
import type {
  CertificateDetail,
  CertificateDetailResponse,
  CertificateListItem,
  CertificatesListResponse
} from '#shared/types/certificate'

type FetchStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Phase 6.4 — certificates store.
 *
 * Hydrated on boot for authed users by `app/plugins/certificates.ts` (the
 * dashboard sidebar surfaces a "Сертифікати" entry, so the boot prefetch
 * keeps the list ready when the user clicks through). Detail responses
 * are cached separately, keyed by uuid — once visited, navigating away
 * and back re-uses the cached payload without a refetch.
 *
 * Mirrors the single-flight pattern in `enrollments.ts`. Imperative-only:
 * every call goes through `useApi()`.
 *
 * @author Tymofii Synianskyi
 */
export const useCertificatesStore = defineStore('certificates', () => {
  const items = ref<CertificateListItem[]>([])
  const status = ref<FetchStatus>('idle')
  const error = ref<ApiError | null>(null)
  const initialized = ref(false)

  // Single-flight guard — boot plugin + dashboard page can both call
  // `init()` in the same tick; they share one in-flight promise.
  const initInflight = ref<Promise<void> | null>(null)

  const details = ref<Map<string, CertificateDetail>>(new Map())

  const activeCertificates = computed(() =>
    items.value.filter(item => item.status === 'active')
  )
  const revokedCertificates = computed(() =>
    items.value.filter(item => item.status === 'revoked')
  )

  function getCertificate(uuid: string): CertificateListItem | null {
    return items.value.find(item => item.uuid === uuid) ?? null
  }

  function getDetail(uuid: string): CertificateDetail | null {
    return details.value.get(uuid) ?? null
  }

  function clear(): void {
    items.value = []
    status.value = 'idle'
    error.value = null
    initialized.value = false
    initInflight.value = null
    details.value = new Map()
  }

  async function refresh(): Promise<void> {
    const api = useApi()
    status.value = 'loading'
    try {
      const response = await api.get<CertificatesListResponse>('/vl/v1/certificates/me')
      items.value = Array.isArray(response?.data?.items) ? response.data.items : []
      status.value = 'ready'
      error.value = null
    } catch (caught) {
      status.value = 'error'
      error.value = caught as ApiError
    } finally {
      initialized.value = true
    }
  }

  function init(): Promise<void> {
    if (initialized.value) {
      return Promise.resolve()
    }
    if (initInflight.value) {
      return initInflight.value
    }
    const promise = refresh().finally(() => {
      initInflight.value = null
    })
    initInflight.value = promise
    return promise
  }

  async function fetchDetail(uuid: string): Promise<CertificateDetail> {
    const api = useApi()
    const response = await api.get<CertificateDetailResponse>(
      `/vl/v1/certificates/${uuid}`
    )
    const detail = response.data
    const next = new Map(details.value)
    next.set(uuid, detail)
    details.value = next
    return detail
  }

  return {
    // state
    items,
    status,
    error,
    initialized,
    details,
    // getters
    activeCertificates,
    revokedCertificates,
    // utilities
    getCertificate,
    getDetail,
    // actions
    init,
    refresh,
    fetchDetail,
    clear
  }
})
