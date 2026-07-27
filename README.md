# vl-frontend

Nuxt 4 frontend for **Green Paws LMS** — a headless learning management system for veterinarians. The backend is a WordPress install (`backend/`) running the `vl-lms` and `vl-jwt-auth` plugins; this app talks to it over the `vl/v1` and `vl-auth/v1` REST namespaces using JWT auth.

The current scope covers the public catalog (courses, webinars, search), the full unauthenticated auth flow (registration → email verification → login → password reset), session management, and SEO infrastructure (sitemap, robots, JSON-LD). Authenticated learning experience (course player, progress, certificates) is not in this codebase yet.

## Stack

- Nuxt 4 (SSR enabled) on Node 20+
- `@nuxt/ui` v4 + Tailwind CSS v4 — brand color overridden via `app.config.ts`
- `@nuxtjs/i18n` — Ukrainian (`uk`) only for now, `no_prefix` strategy
- `@nuxtjs/color-mode` — light by default
- `@nuxt/fonts` — Onest (sans) + Source Serif 4 (serif), `cyrillic + latin` subsets
- `@pinia/nuxt` for the auth store, `@vueuse/nuxt` for misc utilities
- `zod` for client-side form schemas
- `@nuxt/eslint` (stylistic: 1tbs, no trailing commas)

## Prerequisites

- Node.js **20+**, npm **10+**
- Backend running at `https://green-paws-lms-backend.ddev.site` (or wherever DDEV places it) with:
  - `vl-jwt-auth` and `vl-lms` plugins active
  - `vl-cors` mu-plugin in place
  - `wp-config.php` defining `VL_CORS_ORIGINS` with this app's origin (e.g. `http://localhost:3000`)
  - `VL_JWT_AUTH_SECRET_KEY` defined for `vl-jwt-auth`

## Setup

```bash
npm install
cp .env.example .env   # adjust hostnames if your DDEV site differs
npm run dev
```

Then open <http://localhost:3000>.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NUXT_PUBLIC_WP_API_BASE` | Public WordPress REST base, e.g. `https://green-paws-lms-backend.ddev.site/wp-json` — drives the `vl/v1/*` calls |
| `NUXT_PUBLIC_WP_AUTH_BASE` | `vl-jwt-auth` namespace base, e.g. `…/wp-json/vl-auth/v1` |
| `NUXT_WP_API_BASE_INTERNAL` | Server-only override for SSR fetches. In DDEV dev, set to the plain-HTTP backend URL so Node's fetch bypasses the mkcert leaf cert (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Reserved for Docker network hostnames in prod. |
| `NUXT_PUBLIC_SITE_URL` | Absolute frontend URL (no trailing slash). Used by `sitemap.xml`, `robots.txt`, and JSON-LD `@id`s. Falls back to `http://localhost:3000` |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server on `http://localhost:3000` |
| `npm run build` | Production build |
| `npm run generate` | Static site generation |
| `npm run preview` | Preview the production build locally |
| `npm run lint` / `lint:fix` | ESLint (with optional `--fix`) |
| `npm run typecheck` | `nuxt typecheck` (vue-tsc) |

## Routes

### Public
- `/` — home
- `/courses`, `/courses/[slug]` — course catalog list + landing page
- `/webinars`, `/webinars/[slug]` — webinar catalog list + landing page
- `/search?q=…` — cross-type search across courses and webinars

### Auth (guest-only via `middleware/guest.ts`)
- `/login`, `/register`
- `/forgot-password`, `/reset-password`
- `/verify-email`, `/resend-verification`

### Authenticated (gated by `middleware/auth.ts`)
- `/account` — profile / overview
- `/account/sessions` — active refresh-token sessions, revoke individual / revoke other

### Server routes (Nitro)
- `/sitemap.xml` — homepage + catalog roots + every course/webinar slug. Pages courses and webinars in batches of 50, capped at 20 pages per type. 5-minute s-maxage.
- `/robots.txt` — disallows the auth pages, `/account*`, `/dashboard*`, `/learn*`, `/search`, and any URL with `?return_to=`. Points to `/sitemap.xml`.

`routeRules` in `nuxt.config.ts` render `/courses/*` and `/webinars/*` (single-segment detail routes only) client-only (`ssr: false`) — they were prerendered at build time in earlier phases, and briefly SWR-cached, before being switched to sidestep SSR limitations around their client-side interactions. Consequence: crawlers and link-preview bots currently receive an SPA shell for catalog detail pages, not populated HTML.

Components are auto-imported with `pathPrefix: false` (`nuxt.config.ts → components`), so files keep their bare filenames regardless of folder (`<CourseCard>` from `components/catalog/CourseCard.vue`, `<EnrolledCourseCard>` from `components/dashboard/EnrolledCourseCard.vue`, etc.). New component filenames must therefore stay globally unique across `app/components/`.

## API client

`composables/useApi.ts` exposes both an imperative `useApi()` (for mutations / event handlers) and a declarative `useApiFetch` (for `<script setup>` GETs that should hydrate via the SSR payload). The two share a single options builder so header injection, SSR cookie passthrough, and error normalization happen exactly once.

Behaviors worth knowing:

- **Header injection.** `Authorization: Bearer <access_token>` is added when an authenticated access token is in the auth store. Calls that hit `/vl-auth/v1/token`, `/token/refresh`, or any unauthenticated `/vl/v1/auth/*` endpoint pass `{ auth: false }` to opt out.
- **Refresh cookie.** `credentials: 'include'` is set globally so the path-scoped HttpOnly refresh cookie issued by `vl-jwt-auth` reaches `/vl-auth/v1/*`. The cookie is path-scoped on the backend, so it never leaks to `/vl/v1/*`.
- **SSR cookie passthrough.** During SSR the browser is not in the loop; `useRequestHeaders(['cookie'])` forwards the incoming `Cookie` header onto outgoing API calls so refresh + `me` lookups still work on first paint.
- **401 refresh-and-retry.** A 401 from a request with `auth !== false` triggers `authStore.refresh()` and a single retry. Concurrent 401s are coalesced through the auth store's single-flight `refreshInflight` promise, so N parallel failures cost exactly one `/token/refresh` round-trip. If refresh itself fails on the client, `navigateTo('/login')` kicks the user out.
- **Error normalization.** `onResponseError` collapses both response shapes — `vl-jwt-auth`'s `{ success: false, error: { code, message, status } }` envelope and `vl-lms` / WP-REST's `{ code, message, data: { status } }` shape — into a single `ApiError`. Network failures (no response) become `{ code: 'network_error', status: 0 }`.

## Auth store

`stores/auth.ts` (Pinia composition setup) owns:

- `user`, `accessToken` (with decoded `exp`), `status` (`idle | loading | authenticated | unauthenticated`)
- `isAuthenticated`, `isHydrated` getters
- `hasRole(role)` for capability gating in components
- Actions: `login`, `register`, `logout`, `refresh`, `fetchMe`, `verifyEmail`, `resendVerification`, `requestPasswordReset`, `confirmPasswordReset`, `listSessions`, `revokeSession`, `revokeOtherSessions`
- `decodeJwtExpiry()` — parses the JWT `exp` claim with no signature check; the server is the source of truth for validity, the client only uses `exp` to know when to preemptively refresh

`plugins/auth.ts` boots the store on app init: in SSR/CSR it attempts a `refresh()` to rehydrate from the refresh cookie, falling back to `unauthenticated` on any failure.

## SEO infrastructure

- `composables/useStructuredData.ts` wires JSON-LD into the page via `useHead`.
- `utils/buildCourseSchema.ts` / `buildEventSchema.ts` / `buildBreadcrumbSchema.ts` produce `Course`, `Event`, and `BreadcrumbList` schema objects respectively.
- `composables/useSiteUrl.ts` resolves absolute URLs against `runtimeConfig.public.siteUrl` for canonical links and JSON-LD `@id`s.
- Course and webinar landing pages emit `Course` / `Event` schemas plus a breadcrumb trail; list pages emit only the breadcrumb.

## Project layout

```
app/
  app.vue / app.config.ts        # Root + Nuxt UI tokens (brand/stone colors, lucide icon set)
  error.vue                      # Custom error layout
  assets/css/                    # Tailwind + Nuxt UI imports
  components/
    AppHeader.vue, AppFooter.vue, AppWordmark.vue, AppColorModeToggle.vue
    EmptyState.vue, ErrorState.vue, LoadingSkeleton.vue, NotFound.vue
    catalog/                     # CatalogShell, FilterSidebar, ActiveChips,
                                 #  Breadcrumbs, CourseCard, WebinarCard,
                                 #  CourseHero, WebinarHero, WebinarMaterials,
                                 #  CurriculumAccordion, LandingDetails,
                                 #  LandingInstructors, CatalogCardCover
  composables/
    useApi.ts                    # See "API client" above
    useSiteUrl.ts
    useStructuredData.ts
  layouts/
    default.vue, auth.vue, dashboard.vue, learn.vue
  middleware/
    auth.ts                      # Gates /account*, /dashboard*, /learn*
    guest.ts                     # Bounces authed users away from /login etc.
  pages/                         # See "Routes" above
  plugins/
    auth.ts                      # Boot-time refresh attempt
  schemas/
    auth.ts                      # Zod schemas for login/register/reset forms
  stores/
    auth.ts                      # Pinia auth store (see above)
  utils/
    buildCatalogQuery.ts         # Filter/sort/page → query-string builder
    buildBreadcrumbSchema.ts     # JSON-LD BreadcrumbList
    buildCourseSchema.ts         # JSON-LD Course
    buildEventSchema.ts          # JSON-LD Event (webinar)
    formatDuration.ts            # ISO-ish "Xh Ym" formatter
    formatPrice.ts               # Currency-aware price formatter
    formatScheduledDate.ts       # Webinar start/end formatter
    formatRelativeDate.ts        # "in 3 days", "2 hours ago"
    formatFileSize.ts            # KB / MB / GB
    resolveAuthError.ts          # ApiError code → translated message
    safeRedirectTarget.ts        # Whitelisting for ?return_to=

shared/
  types/api.ts                   # ApiEnvelope<T>, ApiError, HealthzResponse
  types/auth.ts                  # User, TokenResponse, sessions, payloads
  types/catalog.ts               # Course/Webinar cards, detail, list pagination

server/
  routes/
    sitemap.xml.ts               # Catalog-aware sitemap
    robots.txt.ts                # User-agent: * + disallows + sitemap pointer

i18n/locales/uk.json             # Ukrainian translations (default + only locale)
public/favicon.ico
nuxt.config.ts
.env.example
```

## Troubleshooting

- **CORS preflight fails** (`OPTIONS` returns 4xx, browser blocks the request): confirm the backend `wp-config.php` defines `VL_CORS_ORIGINS` and that the value includes this app's origin. The `vl-cors` mu-plugin is the single source of truth on the backend.
- **SSL certificate error** when fetching the backend: DDEV uses `mkcert`. Run `mkcert -install` on the host so the system trust store contains the DDEV CA.
- **`404` on `/wp-json/vl/v1/healthz`**: confirm both `vl-lms` **and** `vl-jwt-auth` are active (the LMS plugin short-circuits during boot when its dependency is missing).
- **`.env` URL mismatch**: confirm the DDEV project URL with `ddev describe` in the backend directory, then align `NUXT_PUBLIC_WP_API_BASE` and `NUXT_PUBLIC_WP_AUTH_BASE`.
- **Refresh loop / "redirected to /login on every page"**: the refresh cookie is path-scoped to `/wp-json/vl-auth/v1/`; if requests are aimed at the wrong base, the cookie won't attach. Check that `useApi`'s `baseURL` matches `NUXT_PUBLIC_WP_API_BASE` and that the cookie path on the response is `/wp-json/vl-auth/v1/`.
- **JSON-LD `@id`s point at `localhost`**: set `NUXT_PUBLIC_SITE_URL` to the public origin in production. Without it the composable falls back to the dev default.
- **Network error with no status code**: the backend is most likely not running — `ddev status` to check, `ddev start` to bring it up.
