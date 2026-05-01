# Phase 6.4 — Certificates Frontend Smoke

Manual verification checklist for the certificate dashboard surfaces and
the public verification page. Run against the DDEV backend with the demo
seeder applied. Phase 6.3 backend must be alive — at least one course
needs `_vl_course_certificate_enabled=1` and a final-exam quiz, and the
student must have completed it (see `PHASE-6.3-SMOKE.md` recipe 1 to
auto-issue a certificate first).

## Prerequisites

- Backend running (`ddev start` in `backend/`).
- Frontend running (`npm run dev` in `frontend/`).
- DevTools open with Network tab filtered to `certificates`.
- One issued certificate already exists for the test student.

```sh
STUDENT="student.bohdan"
PASSWORD="hunter2hunter2"
```

---

## 1. Cold dashboard load

1. Log in as `STUDENT`. Navigate to `/dashboard`.
2. Sidebar renders four entries; "Сертифікати" sits between "Моє
   навчання" and "Профіль" with the `i-lucide-award` icon.
3. Click "Сертифікати". URL becomes `/dashboard/certificates`.
4. Network: one `GET /vl/v1/certificates/me` 200. (The boot plugin
   already prefetches on authed boot — confirmed by a request firing
   right after login as well.)
5. List renders one or more certificate cards.

## 2. Empty state

1. Log in as a student with zero certificates (or revoke them via
   PHASE-6.3 recipe 10).
2. Navigate to `/dashboard/certificates`.
3. EmptyState renders: `i-lucide-award` icon, title "Поки що немає
   сертифікатів", body "Завершіть курс, щоб отримати сертифікат.",
   CTA button "До каталогу курсів".
4. Click the CTA. URL becomes `/courses`.

## 3. Detail navigation

1. From the populated list, click "Переглянути" on a card.
2. URL becomes `/dashboard/certificates/{uuid}`.
3. Network: one `GET /vl/v1/certificates/{uuid}` 200.
4. Page renders: course title, learner name, instructors, issuer,
   issued date, score (if non-null), "Завантажити PDF" button,
   "Сторінка верифікації" button, UUID footer.
5. Back link "Сертифікати" returns to the list.

## 4. PDF download

1. From the detail page, click "Завантажити PDF".
2. Button shows loading spinner briefly.
3. Browser triggers a file save dialog (or auto-saves) for
   `certificate-{uuid}.pdf`.
4. Network: one `GET /vl/v1/certificates/{uuid}/download` 200 with
   `Content-Type: application/pdf` and the `Authorization: Bearer …`
   header attached. Response type is blob.
5. Open the downloaded PDF. Cyrillic renders correctly. The QR code
   scans to `https://{vl_lms_frontend_url}/certificates/{uuid}`.
6. Re-click the button — second download succeeds (cache hit on the
   backend side; same content).

## 5. Public verify — direct URL (logged out)

1. Log out (or open an incognito window).
2. Navigate directly to `/certificates/{uuid}` for an active certificate.
3. Page renders without redirecting to `/login`.
4. Network: one `GET /vl/v1/certificates/{uuid}/public` 200. Headers
   show `X-Robots-Tag: noindex,follow`. Request does NOT include
   `Authorization` (`auth: false` on `useApiFetch`).
5. Page shows: green shield-check icon, "Сертифікат справжній" headline,
   "Видано {issuer} {date}" subtitle, learner display name (e.g.
   "Богдан К."), course title, instructors, score, monospace UUID
   footer.
6. View source — `<meta name="robots" content="noindex,follow">` is
   present in the head.

## 6. Public verify — QR scan

1. Scan the QR code from the PDF saved in recipe 4 with a phone camera.
2. Phone opens the same URL as recipe 5.
3. Same content renders.

## 7. Public verify — malformed UUID

1. Navigate to `/certificates/not-a-uuid`.
2. Route validate rejects: Nuxt's 404 page renders.

## 8. Public verify — non-existent UUID

1. Navigate to `/certificates/00000000-0000-0000-0000-000000000000`.
2. Page renders the in-app `<NotFound>` empty-state (compass-off icon,
   "Сторінку не знайдено", "На головну" CTA).
3. Network: one `GET /vl/v1/certificates/{uuid}/public` 404.

## 9. Revoked detail

1. Manually revoke an active certificate via `wp eval` from
   `PHASE-6.3-SMOKE.md` recipe 12 (or trigger an enrollment revocation
   per recipe 10).
2. Refresh `/dashboard/certificates/{uuid}`.
3. Red `<UAlert>` banner shows at the top: "Сертифікат відкликано" with
   the revoked-at date.
4. The "Завантажити PDF" button is disabled with a tooltip "Завантаження
   недоступне"; clicking it does nothing.
5. The "Сторінка верифікації" link still works.

## 10. Revoked public

1. Navigate to `/certificates/{uuid}` for the revoked certificate (no
   auth needed).
2. Hero renders the revoked variant: red shield-x icon, "Сертифікат
   відкликано" headline, "Відкликано: {date}" subtitle.
3. The score row in the meta block is hidden (revoked == final score
   not shown).
4. Course title, learner display name, instructors, issuer, issued date
   are still shown.

## 11. Logout clears state

1. While viewing `/dashboard/certificates`, click logout from the
   account menu.
2. Auth flips → `clear()` is called by the certificates plugin.
3. Navigate (or be redirected) back to `/dashboard/certificates`.
4. Auth middleware bounces to `/login?return_to=%2Fdashboard%2Fcertificates`.
5. Log back in. Network: one fresh `GET /vl/v1/certificates/me`. List
   re-hydrates.

## 12. Auth-state plugin (boot prefetch)

1. While logged in, hard-refresh the page (cmd+shift+R).
2. Network: one `GET /vl/v1/certificates/me` fires early in the
   lifecycle (before any user navigation), confirming the boot plugin
   prefetched.
3. Click "Сертифікати" in the sidebar — list renders instantly with no
   additional network request (cached).

---

## Acceptance

Items 1, 2, 3, 4, 5, 7, 8 are gating for the local-dev acceptance
criteria. Items 6, 9, 10, 11, 12 are walkable but not gating on the
session that introduced this code (item 6 needs a phone; items 9/10
need a `wp eval` revoke; item 11 needs a clean logout/login round-trip;
item 12 is a confirming observation rather than a binary pass/fail).
