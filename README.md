# Serba Serbi Umroh — Landing Page

Public site for [serbaserbiumroh.id](https://www.serbaserbiumroh.id):
independent-umroh guides, Nusuk hotel pricing, pilgrim stories, WhatsApp
community intake, and a cost estimator for the internal team.

## Stack

| | |
|---|---|
| Framework | Next.js 14.2 (App Router, `output: standalone`) |
| Language | TypeScript, React 18 |
| Database | PostgreSQL 17 + Drizzle ORM |
| Auth | Auth.js v5 (`next-auth@5 beta`) — credentials + Google |
| Content | MDX (`src/content/`) for guides, DB for stories and hotels |
| Article CMS | `badalin-eco-api`, edited from `ssu-admin` — not this repo's DB |
| Styling | Tailwind + shadcn/ui |
| Tests | Vitest + Testing Library (127 files, 1300+ tests) |
| Hosting | Coolify (Docker) on a self-managed VPS |

## Project layout

All application code lives under `src/`. The `@/*` alias resolves there, so
`@/shared/db` means `src/shared/db`.

```
src/
├── app/          Next.js routes — thin, they call into packages/
├── packages/     feature slices (see Architecture below)
├── components/   shared UI, incl. components/ui (shadcn)
├── shared/       infrastructure used everywhere: db, analytics, seo,
│                 utils, hooks, types
├── content/      MDX guides, read from disk at runtime
├── test/         test helpers (import-graph)
└── auth.ts  auth.config.ts  middleware.ts  mdx-components.tsx
```

This mirrors `badalin-visa-web`, which has the same `app` / `components` /
`packages` / `shared` / `test` split. Two differences, both deliberate: this app
has no `i18n/` because it ships Indonesian only, and it adds `content/` for the
MDX guides, which badalin has no equivalent of.

**File names are kebab-case**, without exception — `cta-band.tsx`,
`site-footer.tsx`, `repository.port.ts`. Exported symbols stay PascalCase
(`export function CtaBand`). Same rule as badalin.

Kept at the repo root on purpose: `public/` (served verbatim by Next),
`drizzle/` (migrations, not application code), `scripts/` (one-off tooling run
with `tsx`), and the config files.

Two things depend on this layout beyond the alias — change them together if the
layout moves again: `src/shared/panduan.ts` reads `process.cwd()/src/content/panduan`
from disk, and `next.config.mjs` traces `./src/content/**/*` into the standalone
output so those files exist in the container.

## Architecture

New feature code follows the hexagonal (ports-and-adapters) layout already used
in `badalin-visa-web`. Business rules sit in the middle and know nothing about
Next.js, Drizzle or React; everything that touches the outside world is an
adapter plugged into an interface.

```
src/packages/<context>/<slice>/
├── domain/           types + pure rules. No imports from next, drizzle or react.
│   └── __tests__/    the cheapest tests in the repo — no mocks needed
├── port/
│   ├── repository.port.ts   what the use case needs from storage
│   └── usecase.port.ts      what the outside world may ask of this slice
├── usecase/          business logic. Depends on ports, never on adapters.
├── repository/       the Drizzle side. All schema imports for the slice live here.
└── presentation/
    ├── controller.ts  composition root: binds adapter → use case
    └── view/          React components, `*.view.tsx`
```

**The dependency rule.** Arrows point inward only:

```
route handler / page  →  presentation/controller  →  usecase  →  port  ←  repository
                                                       ↓
                                                     domain
```

`usecase` imports `port`, never `repository`. Swapping Postgres for an HTTP API
means writing a new adapter, and nothing in `domain/` or `usecase/` changes.

**Why a slice looks slightly different from badalin's.** There, controllers are
React hooks because the data lives behind a REST API and react-query. This app
talks to its own database from the server, so a controller is usually a plain
function that a route handler calls. Same layering, different runtime. Reach for
a hook-shaped controller only when a slice genuinely needs shared client state.

**Errors that the caller must distinguish are return values, not throws.** A use
case returns `{ ok: false, error }` for a rejected input and lets real faults
throw, so a route handler can map the first to 400 and the second to 500.

### Reference slice

`src/packages/community/join/` is fully migrated — read it before writing a new one.
It covers all five layers, including a repository whose only job is one Drizzle
insert, and its route handler (`src/app/api/community/join/route.ts`) is down to
argument shuffling.

### Migration status

The rest of the codebase still uses the older flat layout: logic in `src/shared/<area>/`,
components in `src/components/<area>/`, DB access inline in route handlers. Both
styles coexist on purpose — a rewrite in one sweep is how a working site
breaks. Move a slice when you are already changing it.

| Slice | Status |
|---|---|
| `community/join` | ✅ migrated — reference |
| `community/admin-requests` | pending (`src/shared/community/admin-requests*.ts`) |
| `estimate` | pending (`src/shared/estimate/`, `src/shared/budget/`, `src/shared/ai/`) |
| `hotel` | pending (`src/shared/hotels/`, `src/shared/hotel-nusuk/`) |
| `story` | pending (`src/shared/stories/`) |
| `faq` | pending (`src/shared/faq.ts`) |
| `article` | pending (`src/shared/articles.ts`) |
| `stats` | pending (`src/shared/stats/`) |

Anything genuinely cross-cutting — `src/shared/db`, `src/shared/analytics.ts`,
`src/shared/seo/`, `src/shared/utils.ts`, `src/shared/hooks/`, `src/shared/types/`
— stays in `shared/` and never moves into a package.

## Route map

**Public** — `src/app/(public)/`

```
/                      home
/panduan/[slug]        independent-umroh guides (MDX)
/artikel/[slug]        articles, pulled from badalin-eco-api
/cerita-jamaah/[slug]  pilgrim stories
/hotel-nusuk/[slug]    Nusuk hotel list and detail
/komunitas             WhatsApp group intake form
/layanan  /visa  /transportasi  /badalin
/faq  /webinar-umroh-mandiri  /template-email
```

**Requires login** — guarded by `PRIVATE_PREFIXES` in `src/middleware.ts`

```
/dashboard             the signed-in user's estimates
/estimate/new          cost estimator (admin only)
/estimate/[id]         reopen a saved estimate
/pricelist-hotel       full hotel price list
```

**Admin** — `src/app/(admin)/`, requires `role = ADMIN`

```
/admin/pricing             hotel, airline, FX and fee tables
/admin/content/hotels      hotel CRUD
/admin/content/stories     pilgrim story CRUD
/admin/content/faqs        FAQ CRUD
/admin/community-requests  incoming group requests
/admin/users               user management
/admin/visitor-stats       visitor statistics
```

## Running locally

Requires **Node 22** (not 20 — see the deployment notes) and pnpm.

```bash
pnpm install
cp .env.example .env.local     # then fill in the values
pnpm db:migrate                # apply Drizzle migrations
pnpm seed                      # optional starter data
pnpm dev
```

### Environment variables

| Variable | Required | Notes |
|---|:-:|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | session encryption key; changing it signs everyone out |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | Google sign-in |
| `SSU_API_URL` / `SSU_API_KEY` | ✅ | article source; `SSU_API_KEY` must match `INTERNAL_API_KEY` in `badalin-eco-api` |
| `ANTHROPIC_API_KEY` | | AI estimate parsing (`src/shared/ai/parse.ts`) |
| `NEXT_PUBLIC_GA_ID` | | GA4 ID. Unset means the GA tag is not rendered at all |
| `NEXT_PUBLIC_COMMUNITY_ADMIN_WHATSAPP_URL` | | admin WhatsApp number or link |
| `NEXT_PUBLIC_SSU_GROUP_URL_1..5` | | group invite links, `_1` is SSU I |
| `NEXT_PUBLIC_SHOW_MONTHLY_HOTEL_PRICE` | | show the monthly price grid |
| `WEBINAR_RSVP_URL` | | webinar RSVP link, server-only |

Production still uses the older `NEXTAUTH_SECRET` and `NEXTAUTH_URL` names.
Auth.js v5 accepts both; use `AUTH_SECRET` / `AUTH_URL` for anything new.

Every `NEXT_PUBLIC_*` value is **baked in at build time**, not read at runtime.
If one is empty during the build it stays `undefined` in the browser no matter
how correct the server's environment is.

## Commands

```bash
pnpm dev            # development server
pnpm build          # production build — run this before pushing
pnpm test           # full suite, single run
pnpm test:watch     # watch mode

pnpm db:generate    # generate a migration from schema changes
pnpm db:migrate     # apply migrations
pnpm db:studio      # Drizzle GUI

pnpm import:real-prices        # import hotel prices from CSV
pnpm sync:room-multipliers     # sync room-type multipliers
pnpm backfill:hotel-slugs      # fill in missing hotel slugs
```

A green `pnpm test` does **not** mean the deploy is safe. The tests see neither
the server/client component boundary nor the "Collecting page data" stage. This
has already burned us once: 1324 tests passed, production returned 500. Run
`pnpm build` before pushing.

Note that `.gitignore` currently excludes `**/__tests__/` and `**/*.test.ts`, so
the suite lives only on each developer's machine and no CI can run it. Worth
fixing before relying on it as a gate.

## Deployment

Coolify pulls from the **`ssu`** remote (`kewebin-id/ssu-landing-page`), not
`origin`. This repo has two:

```bash
git push origin master && git push ssu master
```

Pushing only to `origin` leaves the deployment unchanged.

The pipeline: Coolify builds the multi-stage `Dockerfile` → the container joins
the `coolify` docker network → Traefik terminates TLS and issues the Let's
Encrypt certificate.

### Things that have bitten us

**Node 22, not 20.** `isomorphic-dompurify` pulls in jsdom → undici 8, which
calls `worker_threads.markAsUncloneable` at import time. That API does not exist
on Node 20 and the build dies on `/artikel/[slug]`.

**`DATABASE_URL` uses the container name, not an IP.** Container IPs change
whenever the container is recreated; the name does not. Both containers sit on
the `coolify` docker network.

**Tick "Build Variable" in Coolify** for every `NEXT_PUBLIC_*` and for
`DATABASE_URL` — the build reads them through `ARG` in the Dockerfile.
Everything else can stay runtime-only.

**`trustHost: true` lives in `src/auth.config.ts`, not `src/auth.ts`.** `src/middleware.ts`
builds its own `NextAuth()` from the same config, so putting it in `auth.ts`
fixes only half the requests.

## Analytics

GA4 is wired up in `src/app/layout.tsx` and only renders when `NEXT_PUBLIC_GA_ID` is
set. Custom events are defined in `src/shared/analytics.ts` and called like this:

```ts
track(ANALYTICS_EVENTS.COMMUNITY.SUCCESS, { reason: "..." })
```

For outbound links inside a server component, use
`src/components/analytics/TrackedLink.tsx`. Import `ANALYTICS_EVENTS` from
`@/lib/analytics`, **never** from `TrackedLink` — that file is `"use client"`,
and a server component reading a property off it throws at render time.

Instrumented: the community funnel (submit/success/failure, group click, admin
click), WhatsApp consult and hotel-price clicks, webinar RSVP and live-stream
clicks, and sign-in. Page views come free from GA, so there are no "view"
events.

## Repo notes

`.claude/settings.json` and `.claude/hooks/` are committed on purpose: the
gstack hook only enforces anything if every clone carries it.
`.claude/settings.local.json` stays ignored — that one is per-developer.
