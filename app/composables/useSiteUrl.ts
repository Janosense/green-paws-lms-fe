/**
 * Resolves the public site URL from runtime config and exposes a small
 * helper to build absolute URLs from internal paths. Centralized here so
 * trailing-slash normalization happens once instead of at every caller.
 *
 * Used by structured-data builders, the sitemap server route, and the
 * robots.txt server route in Phase 3.5.
 */
export function useSiteUrl() {
  const config = useRuntimeConfig()
  const siteUrl = (config.public.siteUrl ?? '').replace(/\/+$/, '')

  function absoluteUrl(path: string): string {
    if (!path) {
      return siteUrl
    }
    if (/^https?:\/\//i.test(path)) {
      return path
    }
    const normalised = path.startsWith('/') ? path : `/${path}`
    return `${siteUrl}${normalised}`
  }

  return { siteUrl, absoluteUrl }
}
