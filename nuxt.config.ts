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

  // Dev-server module-count fix. Without this a cold `nuxt dev` load serves
  // ~1000 individual ESM requests: @nuxt/ui pushes `reka-ui` into
  // `build.transpile`, the Vite builder maps transpile entries into the
  // client dev `optimizeDeps.exclude`, and Vite then serves all ~540 reka-ui
  // modules unbundled. `include` alone cannot fix it — Nuxt drops include
  // entries that collide with exclude — hence the `vite:extendConfig` hook
  // below, which strips the exclude for the client environment only.
  // `optimizeDeps` is dev-only in Vite; production builds are unaffected.
  vite: {
    optimizeDeps: {
      // Deps imported lazily by @nuxt/ui runtime components; pre-bundle them
      // so dev doesn't hit "new dependencies optimized → reloading" churn.
      include: [
        '@iconify/vue',
        'tailwind-variants',
        '@vueuse/integrations/useFuse',
        '@tanstack/vue-virtual',
        '@vueuse/core',
        'zod'
      ]
    },
    server: {
      // Paths are relative to the Vite root, which Nuxt sets to srcDir (app/).
      warmup: {
        clientFiles: [
          './app.vue',
          './layouts/default.vue',
          './pages/index.vue',
          './pages/courses/index.vue',
          './pages/courses/[slug].vue'
        ]
      }
    }
  },

  hooks: {
    'vite:extendConfig'(config, { isClient }) {
      // The object always exists here: the `vite.optimizeDeps` block above is
      // merged into `config` before this hook runs.
      const { optimizeDeps } = config
      if (!isClient || !optimizeDeps) {
        return
      }
      optimizeDeps.exclude = (optimizeDeps.exclude ?? []).filter((id: string | RegExp) => id !== 'reka-ui')
      optimizeDeps.include = [...(optimizeDeps.include ?? []), 'reka-ui', 'reka-ui/namespaced']
    }
  },

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

  // Public catalog detail pages (/courses/*, /webinars/*): swr-cached SSR.
  // The SSR pass is deterministically *anonymous* — the vl-jwt-auth refresh
  // cookie is HttpOnly + path-scoped to the backend origin, so the Node
  // server can never see it — which makes the rendered HTML user-independent
  // and therefore cache-safe. Real content + OG/SEO tags ship in the first
  // byte; every auth/time-dependent block in CourseHero/WebinarHero is
  // wrapped in <ClientOnly> so the cached HTML can't mismatch on hydrate.
  // (These pages were `ssr: false` for a while; the concrete breakage behind
  // that switch — the host-timezone hydration mismatch — was fixed by
  // app/utils/formatInSourceOffset.ts.) Keep the single-segment `*` pattern:
  // the bare index route sharing a cache directory with per-slug payloads
  // trips a Nitro fs-cache ENOTDIR collision in `nuxt preview` (see
  // README troubleshooting).
  //
  // Authed surfaces are marked `ssr: false` so Nuxt ships a SPA shell and
  // never tries to render them server-side. The refresh cookie is invisible
  // to the SSR pass (see above), which would always render an
  // "unauthenticated" shell — and then 302 to /login on hard reload before
  // the browser gets to run the boot refresh. SPA mode sidesteps that
  // entirely; the client-only `auth` middleware and `vl-auth` plugin do the
  // real gate.
  //
  // /verify-email and /reset-password are also SPA-only: their entire payload
  // is the `?token=…` query, but in same-origin production hosting the
  // upstream rewrite can strip the query before Nuxt's SSR pass sees it,
  // baking a "missing token" error view into the HTML that hydration can't
  // reliably override. Rendering on the client lets `window.location` —
  // which is authoritative — drive the page.
  routeRules: {
    '/courses/*': { swr: 300 },
    '/webinars/*': { swr: 300 },
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
      failOnError: false,
      // Catalog detail pages are swr-cached at runtime (routeRules above).
      // Letting the crawler bake them into static HTML at build time would
      // shadow the swr rule on Vercel (static assets win over the ISR
      // function) and freeze every course/webinar page until the next
      // deploy — the staleness that got `prerender: true` reverted in
      // Phase 4. Prefix match, so the `/courses` & `/webinars` index pages
      // themselves still prerender.
      ignore: ['/courses/', '/webinars/']
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
