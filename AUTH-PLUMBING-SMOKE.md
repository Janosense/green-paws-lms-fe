# Phase 2.D — Auth plumbing smoke checklist

Manual verification for the auth data layer landed in 2.D. Once 2.E adds login/register/account UI, this file folds into the Phase 2 final docs.

## What 2.D shipped

- `i18n/locales/uk.json` with `auth.*`, `common.*`, `errors.*` namespaces — every backend error code documented in `PHASE-2-AUDIT.md` has a Ukrainian message.
- `shared/types/auth.ts` — `User`, `AccessToken`, `AuthStatus`, `Session`, request/response payload types matching the backend contract.
- `app/schemas/auth.ts` — Zod schemas with i18n-key error messages (no hardcoded UA copy).
- `app/stores/auth.ts` — setup-style Pinia store: `user`, `accessToken` (in-memory only), `status`; actions for login/register/logout/refresh/fetchMe/verifyEmail/resendVerification/requestPasswordReset/confirmPasswordReset/listSessions/revokeSession/revokeOtherSessions; single-flight `refresh()` via `refreshInflight` ref.
- `app/composables/useApi.ts` — extended interceptor: `auth: false` opt-out, `Authorization: Bearer` injection, SSR cookie passthrough via `useRequestHeaders(['cookie'])`, global `credentials: 'include'`, dual-envelope error normalization (`vl-auth/v1` `{ error: { code, message } }` and WP-default `{ code, message, data }`), and a wrapping `createApiFetch()` that does 401-refresh-and-retry once.
- `app/plugins/auth.ts` — boot plugin with `dependsOn: ['pinia']` that calls `refresh()` + `fetchMe()` and lands at `'authenticated'` or `'unauthenticated'`. (Initial attempt used `enforce: 'pre'` per the brief's suggestion; that crashed at SSR `app:rendered` because `@pinia/nuxt`'s plugin runs at default order — `enforce: 'pre'` placed our plugin _before_ Pinia was installed, so `useAuthStore()` had no active Pinia. `dependsOn: ['pinia']` is the right knob: Pinia's plugin is named `'pinia'` in `@pinia/nuxt/dist/runtime/plugin.vue3.js`. Middleware always runs after plugins, so no extra ordering is needed for the auth/guest middlewares.)
- `app/middleware/auth.ts`, `app/middleware/guest.ts` — named middlewares for protected and guest-only routes.

No UI was added. No `localStorage` / `sessionStorage` / cookies are written from the client — the access token lives only in the Pinia store.

## Decisions made

| Decision | Choice | Notes |
|---|---|---|
| `useAuth()` wrapper composable | **Skipped** for now. | Pinia setup-style stores already _are_ composables. Components consume `useAuthStore()` directly. Re-evaluate in 2.E if cross-cutting routing logic emerges. |
| `@nuxtjs/i18n` major version | **v10** (`^10.3.0`). | The brief said "v9 or whatever supports Nuxt 4". Concrete check: v9 depends on `@nuxt/kit@^3.17`, v10 depends on `@nuxt/kit@^4.4`. v10 is the Nuxt-4 line. |
| `lazy: true` in i18n config | **Removed.** | v10 lazy-loads automatically when `file` is provided; the option no longer exists in `UserNuxtI18nOptions`. |
| `credentials: 'include'` | **Global**, in `buildApiFetchOptions()`. | Backend cookie is path-scoped to `/wp-json/vl-auth/v1/` so it never leaks to other endpoints. Per-request would be safer in principle but bookkeeping-heavy in practice. |
| Refresh deduplication | `refreshInflight: Ref<Promise<void> \| null>` on the auth store, cleared in `.finally()`. | Setup-style Pinia ref is the most idiomatic option. External module-singleton would also work but breaks store isolation in tests. |
| Where the 401 retry runs | **Wrapper layer in `createApiFetch()`**, not inside `onResponseError`. | ofetch always throws after `onResponseError` resolves; there's no supported way to swap a failed response for a successful retry from the interceptor. Documented inline in `useApi.ts`. The shared interceptor pipeline still normalizes the error before the wrapper inspects its status. |
| Types layout | Split into `shared/types/auth.ts`. | `api.ts` stays minimal (envelope + healthz); auth types are domain-specific and worth their own file. |
| Error normalizer envelopes | **Both** `{ success: false, error: {…} }` (vl-auth/v1) **and** `{ code, message, data }` (WP-default for vl-lms) are recognised. | Without this, the `vl-auth/v1` failure path collapsed to `http_<status>` and the UI couldn't react to specific codes. |

## Smoke checklist (run when verifying the wiring end-to-end)

Prereqs: backend running (`ddev start` from `backend/`), frontend dev server running (`npm run dev` from `frontend/`). At least one verified user exists from Phase 2.A.

1. Open `http://localhost:3000`, open DevTools console.
2. Inspect the store: `Object.values(useNuxtApp().$pinia.state.value.auth)`.
   - Expected after boot: `user: null`, `accessToken: null`, `status: 'unauthenticated'`, `refreshInflight: null`.
3. Login from console:
   ```js
   await useNuxtApp().$pinia._s.get('auth').login({ username: '<verified email>', password: '...' })
   ```
   - Expected: status flips to `'authenticated'`, `user` populated, `accessToken.value` set, `accessToken.expires_at` is a unix-second integer in the future.
4. Hard-refresh the page.
   - Expected: the boot plugin re-runs, `POST /vl-auth/v1/token/refresh` fires, `GET /vl-auth/v1/me` follows, status lands at `'authenticated'`.
5. Force the access token to look expired and trigger an authenticated call:
   ```js
   const s = useNuxtApp().$pinia._s.get('auth')
   s.accessToken.value = ''
   await s.fetchMe()
   ```
   - Expected: the first request 401s, `createApiFetch` calls `refresh()`, the retry succeeds. Network tab shows 401 → /token/refresh 200 → /me 200. Exactly one /token/refresh call even if you fire several `fetchMe()` calls back-to-back (single-flight via `refreshInflight`).
6. Manually delete the refresh cookie in DevTools → Application → Cookies → `vl_refresh_token`. Then run any authenticated call (e.g. `s.fetchMe()`).
   - Expected: 401 → /token/refresh 401 → store cleared (`status: 'unauthenticated'`) → `navigateTo('/login')` (the page doesn't exist yet — a 404 is fine; what matters is the URL change and cleared store).
7. From two browser profiles: login on both, then run `await s.revokeOtherSessions()` from profile A. From profile B, trigger an authenticated call.
   - Expected: profile B's first call 401s → /token/refresh returns `refresh_token_invalid` (401) → store cleared → redirect to `/login`. Confirms backend's `password_reset` / family-revoke chain reaches the frontend's silent-refresh path correctly.
8. Smoke the verify-email path (only if a fresh, unverified user is available): from console, `await s.verifyEmail({ token: '<token-from-mailpit>' })`.
   - Expected: backend issues access + refresh; store transitions to `'authenticated'` with the new user.

## Outcomes

_(Fill in when running the checklist. Empty until executed against a live DDEV stack.)_

| Step | Result | Notes |
|---|---|---|
| 1. Boot inspection | — | |
| 2. Initial state | — | |
| 3. Login from console | — | |
| 4. Hard-refresh re-hydrate | — | |
| 5. Forced 401 → silent refresh + retry | — | |
| 6. Dead refresh cookie → cleared store + redirect | — | |
| 7. Cross-profile revoke | — | |
| 8. Verify-email | — | |

## Tooling status

- `npm run lint` — passes (zero errors, zero warnings).
- `npm run typecheck` — passes.
- `npx nuxi prepare` — succeeds.
