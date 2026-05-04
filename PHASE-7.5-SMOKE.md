# Phase 7.5 — Webinar Registration Frontend Smoke

Manual verification checklist for the webinar registration surfaces.
Run against the DDEV backend with at least one published `vl_webinar`
post that has `_vl_webinar_status=scheduled`, a non-trivial Zoom join URL,
and `_vl_webinar_registration_opens_at` / `_vl_webinar_registration_closes_at`
windows configured. Phase 7.3 (backend) must be alive — exercises the
`/vl/v1/webinars/me`, `/vl/v1/webinars/{slug}/registrations`,
`/vl/v1/webinars/{slug}/join`, and `/vl/v1/webinars/{slug}/recording`
endpoints. Phase 7.5 also adds a `?token=` query auth fallback in
`vl-jwt-auth` for the two redirect endpoints.

## Prerequisites

- Backend running (`ddev start` in `backend/`).
- Frontend running (`npm run dev` in `frontend/`).
- DevTools open; Network tab filtered to `webinars`.
- A test student with `vl_register_for_webinar` capability.
- A published `vl_webinar` post `WEBINAR_SLUG` with the meta fields above.

```sh
STUDENT="student.bohdan"
PASSWORD="hunter2hunter2"
WEBINAR_SLUG="example-webinar"
```

Time travel for steps 6/8/9 is done by editing `_vl_webinar_scheduled_start`
and `_vl_webinar_scheduled_end` in wp-admin (or via WP-CLI
`wp post meta update`). The backend `JoinWindowPolicy` early/late grace is
the source of truth for the join window; check `vl-lms` settings for the
configured deltas.

---

## 1. Guest CTA → login

1. Sign out. Open `/webinars/WEBINAR_SLUG`.
2. Hero CTA reads "Зареєструватися". Click it.
3. URL becomes `/login?return_to=/webinars/WEBINAR_SLUG`.

## 2. Authed register (free webinar, registration window open)

1. Sign in as `STUDENT`. Navigate to `/webinars/WEBINAR_SLUG`.
2. Hero CTA reads "Зареєструватися". Click.
3. Toast "Ви зареєстровані". URL becomes `/dashboard/webinars`.
4. List shows the new row under "Майбутні" with status badge "Заплановано".

## 3. CTA persistence after reload

1. From step 2, navigate back to `/webinars/WEBINAR_SLUG`.
2. CTA reads "Ви зареєстровані". A secondary "Перейти в кабінет" link is
   visible.
3. Reload. CTA still reads "Ви зареєстровані" (boot plugin rehydrates the
   store before hydration; no flash of "Зареєструватися").

## 4. Dashboard list rendering

1. Open `/dashboard/webinars`.
2. Sidebar shows "Мої вебінари" with the `i-lucide-calendar-check` icon
   between "Моє навчання" and "Сертифікати". A small badge displays the
   active count.
3. The list row shows thumbnail / title / date / status badge. A small
   countdown text in the row updates every second.

## 5. Dashboard detail countdown

1. Click a row → URL `/dashboard/webinars/WEBINAR_SLUG`.
2. Page renders the long-form countdown ("X д Y год Z хв"). The minute
   tick advances live.
3. "Скасувати реєстрацію" CTA is visible at the bottom.

## 6. Join window opens

1. Edit `_vl_webinar_scheduled_start` to ~5 minutes from now (so the
   join-grace window is open).
2. Reload `/dashboard/webinars/WEBINAR_SLUG`. CTA flips to "Приєднатися".
3. Same on `/webinars/WEBINAR_SLUG` — hero shows the join button.

## 7. Join redirect via `?token=`

1. Click "Приєднатися" on either page.
2. Browser navigates top-level to
   `${API_BASE}/vl/v1/webinars/WEBINAR_SLUG/join?token=<jwt>`.
3. Backend issues a 302 to the canonical Zoom join URL. Browser follows.
4. Note: the bearer token appears in the address bar momentarily; the
   redirect target is on the Zoom origin, so browser-native referrer
   stripping plus the 302 boundary keeps the token off Zoom's logs.

## 8. Past — recording not yet ready

1. Edit `_vl_webinar_scheduled_end` to a moment in the past, but do NOT
   set `_vl_webinar_recording_url`.
2. Reload `/dashboard/webinars/WEBINAR_SLUG`. CTA reads "Запис недоступний"
   (or "Доступ до запису завершено" if `recording_access_days = 0`).
3. The row on `/dashboard/webinars` moves into the "Минулі" section.

## 9. Recording becomes available

1. Trigger the recording-completed webhook (Phase 7.2) — e.g.
   `wp vl-lms zoom simulate-webhook recording.completed --webinar=...`,
   or set `_vl_webinar_recording_url` and
   `_vl_webinar_recording_available_until` directly.
2. Reload the detail page. CTA flips to "Дивитися запис" with an
   "Доступ до запису до …" line.

## 10. Recording redirect

1. Click "Дивитися запис".
2. Browser navigates to
   `${API_BASE}/vl/v1/webinars/WEBINAR_SLUG/recording?token=<jwt>`.
3. Backend 302 to the playback URL.

## 11. Cancel registration

1. With an active future registration: open the detail page or the row's
   "Скасувати реєстрацію" affordance.
2. Confirmation modal appears. Confirm.
3. Toast "Реєстрацію скасовано". Row vanishes from "Майбутні".
4. Toggle "Показати скасовані" on the list page → the row appears under
   the cancelled section.

## 12. Re-register after cancel

1. From the detail page of a cancelled-but-still-open-window registration,
   click "Зареєструватися знову".
2. Toast "Реєстрацію відновлено". Row returns to "Майбутні". The detail
   page refreshes its CTA stack accordingly.

---

## Negative paths to spot-check

- **402 paid_blocked** — set `_vl_webinar_price > 0`. Hero CTA reads
  "Купити квиток" disabled with "Платні вебінари будуть доступні
  незабаром" helper text.
- **409 capacity_reached** — set `_vl_webinar_max_attendees=1` and seed
  one registration from another user; click "Зареєструватися" → toast
  "Всі місця заброньовано", subsequent CTA flips to the same disabled
  copy.
- **Logout while on dashboard** — clears the store; sidebar count
  disappears; navigating back to `/dashboard/webinars` redirects through
  `auth` middleware.
- **Login flips state** — log back in; store rehydrates; sidebar count
  reappears without a hard reload.
