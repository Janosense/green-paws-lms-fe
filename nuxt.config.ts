// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint'
  ],

  ssr: true,

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'uk' },
      titleTemplate: '%s · VL LMS',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' }
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
      wpAuthBase: ''
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
