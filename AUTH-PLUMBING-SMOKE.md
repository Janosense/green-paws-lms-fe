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

---

# Phase 2.E — Auth UI

UI layer on top of the 2.D plumbing. Pages, layouts, toast feedback, error
resolver, redirect-target validation. No new top-level dependencies.

## What 2.E shipped

- `app/layouts/auth.vue`, updated `app/layouts/default.vue` — centered card
  layout for unauthenticated pages, header layout for the rest. Header is
  auth-aware: guest sees Login link + Register button, signed-in user sees
  a `<UDropdownMenu>` with Account / Sessions / Sign out. Hydration uses a
  fixed-width placeholder to avoid layout shift on hard refresh.
- `app/components/AppWordmark.vue`, `app/components/AppColorModeToggle.vue`
  — small reusable chrome.
- `app/utils/resolveAuthError.ts` — pure function that maps an `ApiError`
  to an i18n key under `errors.*`. The `KNOWN_AUTH_ERROR_CODES` allow-list
  is built from `PHASE-2-AUDIT.md`. Forms render `t(resolveAuthError(e))`
  — never `error.message` — because backend strings are English.
- `app/utils/safeRedirectTarget.ts` — strips off-origin and protocol-relative
  redirect targets passed via `?redirect=`.
- Pages: `/login`, `/register`, `/verify-email`, `/forgot-password`,
  `/reset-password`, `/resend-verification`, `/account`, `/account/sessions`,
  and a refreshed `/`.
- `i18n/locales/uk.json` extended: every UA string in 2.E is keyed under
  `auth.*`, `common.*`, `errors.*`, `home.*`, `auth.account_kind.*`,
  `auth.roles.*`. No literal UA in `.vue` files.
- `shared/types/auth.ts` — `User.account_kind?: string`. Reason: vl-lms's
  verify-email response embeds `account_kind`, but vl-jwt-auth's `/me` does
  not. Optional, with a fallback to first WP role on `/account`.
- Toast usage is direct `useToast()` per Nuxt UI v4 — no wrapper.

## Decisions made (delegated in the brief)

| Decision | Choice | Reason |
|---|---|---|
| `index.vue` strategy for authenticated users | **Inline** "welcome back" + button to `/account`. No redirect. | Fewer redirects, simpler mental model, matches the brief's recommendation. |
| Skeleton vs. spinner on `/account/sessions` loading | **Skeleton.** | Preserves layout, no jumpy CLS on slow networks. |
| Home hero imagery | **None.** | Phase 2 is plumbing. Imagery lands with the catalog (Phase 3). |
| `<TheHeader>` / `<TheFooter>` extraction | **Monolithic** in `default.vue`. | One header, no footer in Phase 2 — extraction would be premature. |
| Account-kind label | **Translated**, via `auth.account_kind.{kind}`. Falls back to translated first role, then `auth.account_kind.unknown`. | The backend gap (account_kind missing from `/me`) means we have to degrade gracefully on hard-refresh. |
| Session row layout | **Stacked `<UCard>` rows** with internal flex. | Editorial feel; mobile-friendly; matches Phase 0.5 generosity. |
| `useAuth()` wrapper still skipped | **Yes.** | 2.E surfaced no cross-cutting routing logic that would benefit from one. |
| Where forgot-password / resend-verification "errors" go | Always show generic-success page **unless** the error is network-level (status 0) or 5xx. | Matches the backend's enumeration-safe contract. Real outages still surface as toasts so users don't think the email is on its way when it isn't. |
| Reset-password "weak password" handling | Stays on the form, surfaces a toast. Token errors switch to the error view. | Per brief: weak password is retry-friendly; the token is still valid. |
| Toast vs. page for success states | **Page** for register-sent, forgot-sent, resend-sent, reset-success. **Toast** for transient feedback (sign-out, revoke single session, revoke other sessions, login error). | Per brief: toasts are for transient feedback, not destination states. |
| Verify-email auto-redirect under reduced motion | Skipped via `window.matchMedia('(prefers-reduced-motion: reduce)')`. Manual "Continue" link is always present and is the only path under reduced motion. | Per brief Step 8. |
| `<NuxtLink>` inside `<UContainer>` | Required explicit `import { NuxtLink } from '#components'` in `AppWordmark.vue`. | UContainer wraps content in Reka UI's `<Primitive>`, which alters the component-resolution scope so the auto-import of `NuxtLink` doesn't reach. The literal `<NuxtLink>` in SSR is a tell-tale; importing from `#components` resolves it cleanly. Documented inline. |

## Phase 2.E end-to-end smoke checklist

Run with backend (`ddev start`) and frontend (`npm run dev`) up. Default to
the same verified-user fixtures Phase 2.A/2.B used. Mailpit available at
`https://green-paws-lms-backend.ddev.site:8026` for verification + reset
emails.

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 1 | Register a fresh `phase2e+<ts>@example.test` account on `/register` | "sent" page renders with email; Mailpit receives the verification email | — |
| 1b | Click the link from Mailpit | `/verify-email?token=…` shows "verifying" → "success" → auto-redirects to `/account` after 2s | — |
| 2 | From the header dropdown on `/account`, click **Sign out** | Redirected to `/login`; toast "Ви вийшли з акаунту" appears | — |
| 3 | Log in with wrong password | Toast with "Невірний пароль для цієї електронної пошти." (i.e. `incorrect_password` resolved through `errors.*`) | — |
| 4 | Register a new fresh account, do NOT verify, attempt `/login` with the same email/password | Inline `<UAlert>` "Підтвердьте електронну пошту" appears above the form with a "Надіслати лист повторно" button. Clicking it surfaces the generic success toast. | — |
| 5 | `/forgot-password` → submit a verified email | Confirmation page; Mailpit receives the reset email | — |
| 5b | Click the reset link from Mailpit | `/reset-password?token=…` form; submit a new strong password | "Пароль оновлено" success page; old password now fails on `/login`; new password works | — |
| 6 | Manually expire the reset token (force `_vl_password_reset_token_expires` into the past or wait >1h) and submit | Token-error view with "Лінк застарів" + "Замовити нове посилання" CTA | — |
| 7 | Submit `/reset-password` with a weak password (e.g. "short") | Toast `vl_lms_password_reset_weak_password`, page does not navigate, can retry with the same token | — |
| 8 | Two browser profiles, both logged in. From profile A's `/account/sessions`, click **Завершити інші сесії** | Profile B's next authenticated request 401s → silent refresh fails → cleared and redirected to `/login` (existing 2.D behavior) | — |
| 9 | Direct visit `/account` while signed out | Redirected to `/login?redirect=/account`; after login, lands on `/account` | — |
| 10 | Direct visit `/login` while signed in | Redirected to `/account` (guest middleware) | — |
| 11 | OS-level reduced motion ON, visit `/verify-email?token=<valid>` | "success" view renders, NO auto-redirect; manual "Перейти до акаунту" is required | — |
| 12 | `/login?redirect=https://evil.com` then log in | Lands on `/account`, NOT on the external URL (`safeRedirectTarget` strips off-origin and protocol-relative paths) | — |
| 13 | Tab through `/login` keyboard-only, Enter on the submit button | Focus order is email → password → submit; Enter submits; Sign-up and Forgot links are tabbable | — |
| 14 | `npm run lint` and `npm run typecheck` | Both green | ✅ green at commit time |

## Tooling status (2.E commit)

- `npm run lint` — passes (zero errors, zero warnings).
- `npm run typecheck` — passes.
- `npm run dev` — boots; SSR-rendered `/`, `/login`, `/register`,
  `/forgot-password`, `/reset-password?token=…`, `/verify-email?token=…`,
  `/resend-verification` all return 200 with correctly-translated `<title>`s
  and resolved `<NuxtLink>` anchors. `/account` and `/account/sessions`
  redirect via the `auth` middleware to `/login` for unauthenticated requests.

## Known gaps for follow-up phases

- `account_kind` is not surfaced by `GET /vl-auth/v1/me`. The /account page
  degrades to first-role label after a hard refresh. A backend follow-up
  to include `_vl_account_kind` in the `/me` payload would close this.
- The auth/guest middleware redirect targets are hardcoded (`/login`,
  `/account`); when 2.E+ adds onboarding flows, these may want to become
  configurable via runtime config.
- No frontend tests yet (carry-over from 2.D — the project still has no
  vitest / @vue/test-utils setup).
