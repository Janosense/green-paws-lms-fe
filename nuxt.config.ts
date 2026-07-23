// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxt/image',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint'
  ],

  // Phase 9.7 — image optimisation. ipx is the default Node-side resizer
  // bundled with Nuxt; production-host images come from the headless WP
  // backend, so its origin is whitelisted under `domains`.
  image: {
    provider: 'ipx',
    domains: ['green-paws-lms-backend.ddev.site'],
    format: ['avif', 'webp'],
    quality: 80,
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536
    }
  },

  ssr: true,

  components: [
    { path: '~/components', pathPrefix: false }
  ],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'uk' },
      titleTemplate: '%s · VL LMS',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'apple-mobile-web-app-title', content: 'Green Paws' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light',
    storageKey: 'vl-color-mode',
    classSuffix: ''
  },

  runtimeConfig: {
    // Server-only (SSR). Empty in Phase 0, reserved for future internal URLs.
    wpApiBaseInternal: '',

    public: {
      // Read from NUXT_PUBLIC_* env vars automatically.
      wpApiBase: '',
      wpAuthBase: '',
      // Phase 3.5: absolute site URL used by sitemap.xml, robots.txt, and
      // JSON-LD structured data. Falls back to the local dev origin.
      siteUrl: 'http://localhost:3000'
    }
  },

  // Public catalog: prerendered at build time so Google / OpenGraph crawlers
  // see real HTML. SWR (the previous Phase 3.4 setting) requires a Nitro
  // server, which a static host doesn't provide.
  //
  // Authed surfaces are marked `ssr: false` so Nuxt ships a SPA shell and
  // never tries to render them server-side. The vl-jwt-auth refresh cookie
  // is HttpOnly + path-scoped to the *backend* origin, so a Node SSR pass
  // can't see it cross-origin and would always render an "unauthenticated"
  // shell — which then 302s to /login on hard reload before the browser
  // gets to run the boot refresh. SPA mode sidesteps that entirely; the
  // client-only `auth` middleware and `vl-auth` plugin do the real gate.
  //
  // /verify-email and /reset-password are also SPA-only: their entire payload
  // is the `?token=…` query, but in same-origin production hosting the
  // upstream rewrite can strip the query before Nuxt's SSR pass sees it,
  // baking a "missing token" error view into the HTML that hydration can't
  // reliably override. Rendering on the client lets `window.location` —
  // which is authoritative — drive the page.
  routeRules: {
    '/courses/*': { ssr: false },
    '/webinars/*': { ssr: false },
    '/verify-email': { ssr: false },
    '/reset-password': { ssr: false },
    '/account/**': { ssr: false },
    '/dashboard/**': { ssr: false },
    '/learn/**': { ssr: false },
    '/checkout/**': { ssr: false },
    '/orders/**': { ssr: false }
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      failOnError: false
    }
  },

  compatibilityDate: '2026-04-22',

  typescript: {
    strict: true,
    typeCheck: false
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  fonts: {
    families: [
      {
        name: 'Onest',
        provider: 'google',
        weights: [400, 500, 600, 700],
        subsets: ['cyrillic', 'latin']
      },
      {
        name: 'Source Serif 4',
        provider: 'google',
        weights: [400, 600],
        styles: ['normal', 'italic'],
        subsets: ['cyrillic', 'latin']
      }
    ]
  },

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'uk',
    locales: [
      {
        code: 'uk',
        language: 'uk-UA',
        name: 'Українська',
        file: 'uk.json'
      }
    ]
  }
})
