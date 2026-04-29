# Phase 5.5 — Lesson player runtime smoke recipe

Manual verification steps for the player runtime, auto-save pipeline, resume
prompt, and manual Mark Complete CTA. Run against the DDEV backend. Login as
an enrolled student account before each section.

## Prerequisites

- Backend running (`ddev start` in `backend/`).
- Frontend running (`npm run dev` in `frontend/`).
- DevTools open with Network tab filtered to `progress` (or, for the
  `unload` step, switch to the **Beacon** filter).

## Vimeo lesson

1. Open a lesson whose `video.provider === 'vimeo'`.
2. Watch DevTools — `POST /vl/v1/progress` with `event_type: view_start` fires
   on mount (single shot per page mount; `session_uuid` is fresh).
3. Press play → expect `event_type: play`. After 30 s of continuous playback
   expect `event_type: progress`. Wait another 30 s — expect a second
   `progress`.
4. Pause → expect `event_type: pause`. Scrub the timeline — expect
   `event_type: seek` with payload `{ from, to }`.
5. Scrub past 90 % of duration → expect exactly one `event_type: complete`.
   Continue playing through the end → no second `complete` (the session
   guard blocks the `ended` re-fire).
6. After completion the **Mark Complete** button is replaced by the
   "Завершено" badge.

## YouTube lesson

Same 1-6 as Vimeo, but with YouTube provider. Note: seek events are
synthesized from PLAYING-state position drift > 2 s. A "scrub" produces one
`seek` after the player resumes playing.

## File-provider lesson

Same 1-6 as Vimeo. The native HTML5 `<video controls>` element renders; all
events bubble via the standard media events.

## Embed-provider lesson

1. Open a lesson whose `video.provider === 'embed'`.
2. Confirm the iframe renders.
3. Confirm only `event_type: view_start` fires on mount. No `play`,
   no `progress`, no auto-`complete`.
4. Click **Mark Complete** → `event_type: complete` fires; button is replaced
   by the "Завершено" badge.

## Text-only lesson (no video)

1. Open a lesson where `video === null` (or a topic with `video === null`).
2. Confirm `event_type: view_start` fires on mount.
3. Confirm no heartbeats run.
4. Click **Mark Complete** → `event_type: complete` fires; button is replaced
   by the badge.

## Resume toast

1. On a Vimeo lesson, play to ~30 s, then close the tab.
2. Reopen the same lesson. The toast "Продовжити перегляд?" appears with the
   stored timestamp formatted as `m:ss` (or `h:mm:ss`). It auto-dismisses in
   8 s.
3. Click **Продовжити** → the player seeks to the stored position. Verify
   that subsequent `progress` heartbeats reflect the new position.
4. On a completed lesson the toast does NOT appear. On a lesson with no
   video (text-only) the toast does NOT appear.

## Tab visibility fallback

1. Start playing a Vimeo lesson.
2. Switch to another tab while playback continues in the background.
3. Confirm a `pause` event fires (visibilitychange handler).

## Beforeunload beacon

1. Start a Vimeo lesson, play for ~10 s.
2. Close the tab.
3. In DevTools → Network → Beacon filter on the original tab's recorded
   activity, confirm a `POST /vl/v1/progress` Beacon request was issued
   with `event_type: unload`.
4. Note the documented carry-over: in production the request silently 401s
   because the backend does not yet honor the `__bearer` body fallback.
   The next `view_start` reconciles state on the user's next visit.

## Mark-complete idempotency

1. Open a Vimeo lesson. Scrub to ~89 %.
2. Click **Mark Complete** while still scrubbing past 90 %.
3. Confirm exactly ONE `event_type: complete` fires (the
   `completionFiredThisSession` guard prevents the second).

## Adapter chunking

1. `npm run build`.
2. Inspect `.output/public/_nuxt/` and confirm distinct chunks for
   `VimeoAdapter`, `YouTubeAdapter`, `FileAdapter`, `EmbedAdapter`.

## Carry-over for 5.6

- `sendBeacon` `unload` events 401 in production until the backend
  `RestAuthenticator` reads the JWT from the JSON body's `__bearer` field.
- "Re-mark as incomplete" intentionally not supported.
- Frontend testing infra (Vitest) still pending.

> 2026-04-29 (Phase 5.6): `__bearer` body fallback shipped in
> `\VLJwtAuth\Auth\AuthFacade::user_from_request()` — unload beacons now
> resolve to 201. Verified against DDEV: closing the tab on a
> partially-watched lesson produces a 201 in the Network tab "Beacon"
> filter. Previously 401.
