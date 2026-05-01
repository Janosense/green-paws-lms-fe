import type { ApiError } from '#shared/types/api'
import type { CertificateDetail } from '#shared/types/certificate'
import { resolveCertificateError } from '~/utils/resolveCertificateError'

/**
 * Phase 6.4 — fetch-blob PDF download orchestrator.
 *
 * The backend `GET /certificates/{uuid}/download` requires
 * `Authorization: Bearer …`, which `<a download>` cannot carry. We pull
 * the PDF as a `Blob` through `useApi()` (so the existing 401-refresh
 * interceptor still applies), wrap it in an object URL, then click a
 * temporary anchor to trigger the browser save dialog.
 *
 * `URL.revokeObjectURL` is delayed by a tick — Safari needs the URL to
 * stay live across the click before it can be released.
 *
 * Server-side: the composable is a no-op; `download()` rejects.
 *
 * @author Tymofii Synianskyi
 */
export function useCertificateDownload() {
  const { t } = useI18n()
  const toast = useToast()

  const isDownloading = ref(false)
  const error = ref<ApiError | null>(null)

  async function download(certificate: CertificateDetail): Promise<void> {
    if (import.meta.server) {
      throw new Error('useCertificateDownload.download is client-only')
    }

    isDownloading.value = true
    error.value = null

    try {
      const blob = await useApi().get<Blob>(certificate.download_url, {
        responseType: 'blob'
      })

      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `certificate-${certificate.uuid}.pdf`
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      // Safari requires a tick before the object URL can be revoked,
      // otherwise the download is cancelled mid-flight.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100)
    } catch (caught) {
      const apiError = caught as ApiError
      error.value = apiError
      const resolution = resolveCertificateError(apiError)
      toast.add({
        title: t(resolution.key),
        color: 'error',
        icon: 'i-lucide-octagon-alert'
      })
    } finally {
      isDownloading.value = false
    }
  }

  return {
    download,
    isDownloading,
    error
  }
}
