# vl-frontend

Nuxt 4 frontend for the **Green Paws LMS** — a headless learning management system for
veterinarians. Talks to a WordPress backend (`green-paws-lms-backend`) over the REST API
using JWT auth.

This branch is **Phase 0 (Infrastructure)**. It proves end-to-end connectivity to the
backend with a single smoke-test page hitting `/vl/v1/healthz`. Visual theming
(brand colors, fonts, radii) is intentionally deferred to a later "theme setup" pass —
Phase 0 uses Nuxt UI's default look.

## Prerequisites

- Node.js **20+**
- npm **10+**
- [DDEV](https://ddev.readthedocs.io/) running the `green-paws-lms-backend` project
- Backend plugins active: `vl-lms`, `vl-jwt-auth`
- Backend mu-plugin present: `vl-cors.php`
- `VL_CORS_ORIGINS` constant in backend `wp-config.php` includes `http://localhost:3000`:

  ```php
  define('VL_CORS_ORIGINS', 'http://localhost:3000');
  ```

## Setup

```bash
npm install
cp .env.example .env   # adjust URLs if your DDEV site uses a different hostname
npm run dev
```

Then open <http://localhost:3000>.

## Smoke test

The home page (`/`) fetches `GET {NUXT_PUBLIC_WP_API_BASE}/vl/v1/healthz` from the
browser (client-only) and renders the result. Success looks like a green **ok** badge
with the backend version and an ISO timestamp.

You can verify the full chain in your browser devtools:

1. Network → `healthz` → **OPTIONS** preflight returns `204`.
2. The follow-up **GET** returns `200` with `{ status: "ok", version, timestamp }`.
3. The card on the page shows the `ok` badge.
4. The **Refresh** button re-triggers the request.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start dev server on `http://localhost:3000` |
| `npm run build` | Production build |
| `npm run generate` | Static site generation |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with `--fix` |
| `npm run typecheck` | Run `nuxt typecheck` (vue-tsc) |

## Project structure

```
app/
  app.vue           # Root, wraps <UApp>
  assets/css/       # Tailwind + Nuxt UI imports (no custom tokens yet)
  components/       # (empty — filled in later phases)
  composables/
    useApi.ts       # HTTP client wrapper, WP-REST error normalization
  layouts/
    default.vue     # Minimal shell
  middleware/       # (empty — auth middleware lands in Phase 2)
  pages/
    index.vue       # Smoke test page
  plugins/          # (empty)
shared/
  types/api.ts      # API contract types (ApiEnvelope, ApiError, HealthzResponse)
server/             # Reserved — no BFF routes in Phase 0
```

`shared/` is a Nuxt 4 convention for code reachable from both `app/` and `server/`.

## Troubleshooting

- **CORS preflight fails** (`OPTIONS` returns 4xx, or browser blocks the request):
  check that the backend `wp-config.php` defines
  `VL_CORS_ORIGINS` and that it includes `http://localhost:3000`.
- **SSL certificate error when fetching the backend**: DDEV uses `mkcert`.
  If the system trust store is missing the DDEV CA, run `mkcert -install`
  on the machine hosting the backend.
- **`404` on `/vl/v1/healthz`**: confirm both the `vl-lms` plugin **and** its dependency
  `vl-jwt-auth` are active in WordPress.
- **`.env` URL mismatch**: confirm the DDEV project URL with `ddev describe`
  in the backend directory, then align `NUXT_PUBLIC_WP_API_BASE` in `.env`.
- **Network error with no status code**: the backend is most likely not running —
  `ddev status` to check, `ddev start` to bring it up.

## Notes

- **Theming comes later.** Brand colors, fonts, radius tokens, and the `app.config.ts`
  color overrides will be added in a separate pass. Phase 0 deliberately keeps
  `main.css` minimal (two imports) and ships with Nuxt UI defaults.
- **Auth comes in Phase 2.** `useApi` is the seam where JWT header injection and the
  `401` refresh flow will plug in.
