# frontend — code-area conventions

The Nuxt 4 app, the only user-facing surface of Green Paws LMS, and a multi-feature code area: `core` (catalog, auth, dashboard, the lesson player, quizzes, certificates, checkout) and `study-time` (the active study-time heartbeat). Feature docs live in the root repo, `docs/features/{core,study-time}/`.

## Feature isolation
- `core` owns everything in `frontend/` except `study-time`'s files.
- `study-time` owns three files: `app/composables/useStudyTimeHeartbeat.ts` (the player heartbeat), `app/composables/useStudyTimeSummary.ts` (the learner's own totals from `GET /vl/v1/study-time/me`) and `app/utils/formatStudyDuration.ts` (seconds → «12 год 05 хв»; the seconds-side sibling of `core`'s hours-based `formatDuration.ts`, which it must never replace). It has no bootstrap. Its wiring in `core` is one call per place:
  - `app/pages/learn/[lesson]/index.vue` and `[topic].vue` — the heartbeat, next to `useProgressTracker` (`docs/DECISIONS.md` 2026-09-15);
  - `app/pages/dashboard/index.vue` — the summary, plus one prop passed to the card;
  - `app/components/dashboard/EnrolledCourseCard.vue` — one optional `studySeconds` prop and the line it renders;
  - `i18n/locales/uk.json` — the string `enrollment.stats.study_time`.
- Shared code (`app/composables/useApi.ts`, `app/composables/useLessonPreview.ts`, `app/lib/video/*`, pages, components, stores, `i18n/locales/uk.json`, `nuxt.config.ts`, `package.json` and the tool configs) changes ONLY in an explicit plan task marked **"touches shared code — may affect other features"** that names the consuming features.
- `study-time` reaches `core` only through:
  - `useApi()` (never a raw `$fetch`)
  - `useLessonPreview()` — no request in `?preview=1`
  - the `VideoPlayerAdapter` events (`app/lib/video/types.ts`)

  It never writes a `core` store.
- A feature never writes another feature's data (each `FEATURE.md` → Data): `study-time` writes only through its own `vl/v1/study-time/*` endpoints.

## Area conventions
- `docs/TECH-STACK.md` → ANTI-PATTERNS → Frontend is binding (API client, SPA-only authed routes, date formatting, `.vl-rich-text`, preview mode).
- Components register with `pathPrefix: false`: filenames are global, so no two components share a name in different folders.
- Composition API only. UI strings live only in `i18n/locales/uk.json`.
- There is no test runner — `npm run lint` and `npm run typecheck` are the only static gates (`docs/TESTING.md`); a test runner is a new dependency (root `CLAUDE.md` core rule 1).

## Local commands
```bash
# from frontend/ — setup, env vars and dev troubleshooting: README.md
npm run dev                                          # :3000
npm run lint && npm run typecheck && npm run build
# the commit gate, from the root repo
scripts/check.sh --frontend
```
