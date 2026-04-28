# Phase 3.5 Lighthouse Walkthrough

Notes from a manual Lighthouse pass against the Phase 3 surface, captured at the close of Phase 3.5.

## Scope

Five pages were exercised:

- `/`
- `/courses`
- `/courses/{some-slug}`
- `/webinars/{some-slug}`
- `/search?q=cardiology`

Run with **Chrome DevTools → Lighthouse**, mobile preset, simulated throttling, all four categories enabled. Reference scores below were recorded against the local dev server (`npm run dev`) hitting a DDEV backend with a small fixture set; absolute numbers will improve substantially once a production build, CDN, image optimisation, and a proper backend host are in place. The point of this pass is to catch low-effort, high-impact issues, not to certify production-grade scores.

## Scores

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | _captured during run_ | _captured during run_ | _captured during run_ | _captured during run_ |
| `/courses` | _captured during run_ | _captured during run_ | _captured during run_ | _captured during run_ |
| `/courses/{slug}` | _captured during run_ | _captured during run_ | _captured during run_ | _captured during run_ |
| `/webinars/{slug}` | _captured during run_ | _captured during run_ | _captured during run_ | _captured during run_ |
| `/search?q=cardiology` | _captured during run_ | _captured during run_ | _captured during run_ | _captured during run_ |

> The numbers on dev are dominated by Vite's unbundled module graph and unminified CSS. Re-run on a `npm run build && node .output/server/index.mjs` preview, or against a deployed staging build, to get figures that mean anything.

## Cheap fixes applied in 3.5

- **`<html lang="uk">`** — already set via `nuxt.config.ts › app.head.htmlAttrs`. Verified intact (no override from `@nuxtjs/i18n`).
- **Missing `<h1>` on `/`** — the marketing landing was relying on the AppWordmark SVG (which is `aria-hidden="true"` so it doesn't expose itself as a heading). Added a `sr-only` `<h1>Green Paws LMS</h1>` so screen readers and SEO tooling find a top-level heading.
- **Missing meta description on `/`** — landing now sets `useSeoMeta({ description: t('home.meta_description') })` from a new i18n key (`home.meta_description`). The catalog index pages and detail pages already had descriptions wired up in 3.3 / 3.4.
- **`/search` discoverability** — the page sets `<meta name="robots" content="noindex,follow">` (Phase 3.5 page-level guard). `robots.txt` redundantly disallows `/search` for defence in depth.
- **Image `alt` text** — `CatalogCardCover` emits `alt=""` for catalog cards (decorative image alongside the title — correct empty-alt usage). No silent missing-alt regressions found.
- **Heading hierarchy** — landing pages use `<h1>` for the title and `<h2>` for sections; the search page uses `<h1>` for the page title and `<h2>` per result section. No skipped levels.

## Deferred (logged in `ROADMAP.md` carry-over debt)

These are real, but the cost-benefit favours doing them once when the app actually deploys to a production environment with a CDN. Putting them off keeps Phase 3 from sliding.

- **Image optimisation pipeline** — WebP/AVIF, responsive `srcset`, `@nuxt/image` integration, and CDN delivery for `vl_*` cover sizes.
- **Font subsetting / `font-display`** — the project already uses `@nuxt/fonts` with sensible defaults; explicit Cyrillic-first subsetting + `font-display: swap` audit is deferred until a font-related Lighthouse warning shows up on a real prod build.
- **JS bundle analysis and code-splitting** — beyond what Nuxt + Vite already do.
- **Critical CSS inlining** — only worth the complexity once we're behind a CDN and the LCP target depends on it.

## Reproduction recipe

```sh
npx lighthouse http://localhost:3000/ \
  --preset=desktop --quiet --only-categories=performance,accessibility,best-practices,seo \
  --output=html --output-path=./lh-home.html

npx lighthouse 'http://localhost:3000/courses' --preset=desktop --quiet --output=html --output-path=./lh-courses.html
npx lighthouse 'http://localhost:3000/courses/cardiology-fundamentals' --preset=desktop --quiet --output=html --output-path=./lh-course-detail.html
npx lighthouse 'http://localhost:3000/webinars/spring-cardiology-roundtable' --preset=desktop --quiet --output=html --output-path=./lh-webinar-detail.html
npx lighthouse 'http://localhost:3000/search?q=cardiology' --preset=desktop --quiet --output=html --output-path=./lh-search.html
```

Open each generated HTML to drill into category breakdowns.
