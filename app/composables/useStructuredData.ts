/**
 * Injects one or more JSON-LD blobs into the page head as separate
 * `<script type="application/ld+json">` elements. Schemas appear in the
 * order provided.
 *
 * Built on top of Nuxt's `useHead` so it slots into both SSR and CSR
 * lifecycles. Pass either a single object or an array of objects.
 *
 * Phase 3.5 — used by course/webinar landing pages to emit `Course`,
 * `Event`, and `BreadcrumbList` schemas.
 */
type Jsonable = Record<string, unknown>

export function useStructuredData(schemas: Jsonable | Jsonable[]) {
  const blobs = Array.isArray(schemas) ? schemas : [schemas]
  const safeBlobs = blobs.filter((blob): blob is Jsonable => Boolean(blob && Object.keys(blob).length > 0))

  if (safeBlobs.length === 0) {
    return
  }

  useHead({
    script: safeBlobs.map((blob, index) => ({
      type: 'application/ld+json',
      key: `vl-jsonld-${index}`,
      innerHTML: JSON.stringify(blob)
    }))
  })
}
