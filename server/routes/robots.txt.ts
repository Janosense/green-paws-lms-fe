function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

const DISALLOW_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/resend-verification',
  '/account',
  '/account/',
  '/dashboard',
  '/dashboard/',
  '/learn',
  '/learn/',
  '/search'
]

const DISALLOW_PATTERNS = [
  '/*?return_to='
]

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteUrl = trimTrailingSlash(config.public.siteUrl ?? '')

  const lines: string[] = ['User-agent: *', 'Allow: /']
  for (const path of DISALLOW_PATHS) {
    lines.push(`Disallow: ${path}`)
  }
  for (const pattern of DISALLOW_PATTERNS) {
    lines.push(`Disallow: ${pattern}`)
  }
  lines.push('')
  lines.push(`Sitemap: ${siteUrl}/sitemap.xml`)
  lines.push('')

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  return lines.join('\n')
})
