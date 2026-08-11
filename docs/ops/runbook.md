# Operations Runbook — Coolify

Deployment target: **Coolify** (self-hosted, Docker + Traefik).
Database: **Neon** (unchanged by the migration off Vercel).
Canonical host: `https://www.serbaserbiumroh.id` — see `SITE_URL` in `lib/seo/config.ts`.

> Replaces the Dokploy runbook that previously lived here, and the Vercel setup
> it described in passing. The topologies are close enough that the Dokploy
> notes were mostly right; the steps below are the current ones.

---

## 1. What changes when leaving Vercel

Four things Vercel did implicitly that Coolify does not:

| Vercel did it | On Coolify you must |
|---|---|
| Injected env vars into the build | Pass every `NEXT_PUBLIC_*` as a **build argument** (§3) |
| Redirected apex → www | Configure the redirect yourself (§6) |
| Ran `next build` on its own toolchain | Build the `Dockerfile` in this repo |
| Managed TLS | Let Traefik/Let's Encrypt issue it (§5) |

Nothing in the application code is Vercel-specific — no code reads `VERCEL_URL`.

### The one that fails silently

`NEXT_PUBLIC_*` values are **inlined into the client bundle at build time**, not
read at runtime. If they are absent during `next build`, the build still
succeeds and the values ship as `undefined`. Verified on this repo:

- build without them → the bundle contains the string `Link belum tersedia`
- build with them → the values appear in the client chunk

So a missing `NEXT_PUBLIC_SSU_GROUP_URL_*` does not break the deploy. It ships
five dead WhatsApp group links and a dead admin chat link, quietly. Setting them
as *runtime* environment variables in Coolify is **not** enough — they must be
build arguments. This is why the `Dockerfile` declares an `ARG` for each.

---

## 2. Prerequisites

- Coolify instance reachable, with a server attached
- Neon connection string for the production branch
- DNS for `serbaserbiumroh.id` administered at **Hostinger** (nameservers:
  `solar.dns-parking.com`, `lunar.dns-parking.com`) — not at Vercel, and not at
  Coolify
- Repo access for Coolify (GitHub App or deploy key)

---

## 3. Environment variables

Coolify distinguishes build-time from runtime. Both lists are required.

### Build arguments (must be marked "Build Variable" in Coolify)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SSU_GROUP_URL_1` … `_5` | One WhatsApp invite per SSU group. A blank one renders "Link belum tersedia" rather than a dead link |
| `NEXT_PUBLIC_COMMUNITY_ADMIN_WHATSAPP_URL` | `https://wa.me/<number>` |
| `NEXT_PUBLIC_SHOW_MONTHLY_HOTEL_PRICE` | `true` or `false`. Currently `false` |
| `DATABASE_URL` | Optional at build. Present → hotel and story pages prerender. Absent → they render on demand, which works but is slower on first hit |

### Runtime variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon connection string, `?sslmode=require` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://www.serbaserbiumroh.id` — the **www** host. An apex value sends every auth redirect off the canonical host and back via the apex→www hop |
| `AUTH_TRUST_HOST` | `1` — required behind Traefik |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From GCP Console |
| `ANTHROPIC_API_KEY` | From Anthropic Console |
| `WEBINAR_RSVP_URL` | Only rendered to signed-in users, and only if `https://` |
| `NODE_ENV` | `production` |

`NEXT_PUBLIC_*` should be set in **both** lists: build args for the bundle,
runtime for any server-side read.

### Google OAuth

Add the redirect URI before the first login attempt:

```
https://www.serbaserbiumroh.id/api/auth/callback/google
```

---

## 4. Create the application in Coolify

1. **New Resource → Application → Public/Private Repository**
2. Repository: this repo. Branch: `main`
3. **Build Pack: Dockerfile** (not Nixpacks — the repo ships its own)
4. Port: `3000`
5. Add the variables from §3, marking the build ones as build variables
6. Deploy

The image is a three-stage build: dependency install, `next build`, then a
runner carrying only `.next/standalone`, `.next/static` and `public/`. It runs
as the non-root `nextjs` user and listens on `0.0.0.0:3000`.

`pnpm` is pinned by the `packageManager` field in `package.json` and enabled
through corepack. This matters: pnpm 9 **fails outright** on this repo, because
`pnpm-workspace.yaml` carries only `allowBuilds` and no `packages:` field. An
unpinned `npm install -g pnpm` is a build that breaks on someone else's release
schedule.

---

## 5. Domain and TLS

1. In Hostinger DNS, point both records at the Coolify server:
   - `A  @    <server-ip>`
   - `A  www  <server-ip>` (or `CNAME www` → the Coolify FQDN)
2. In Coolify, set the application domain to `https://www.serbaserbiumroh.id`
3. Let Coolify request the Let's Encrypt certificate

Keep the old Vercel deployment live until DNS has propagated and §7 passes.

---

## 6. Apex → www redirect

**Do not skip this.** `www` is canonical across the sitemap, every canonical
tag, OpenGraph, and JSON-LD. Vercel served the apex→www 307 for free. Without an
equivalent on Coolify, the apex either fails to resolve or serves the whole site
a second time under a non-canonical host — duplicate content, and split ranking
signals.

In Coolify, add `serbaserbiumroh.id` as a second domain on the same application
and enable its redirect-to-primary setting, or add a Traefik redirect label:

```
traefik.http.middlewares.apex-to-www.redirectregex.regex=^https?://serbaserbiumroh\.id/(.*)
traefik.http.middlewares.apex-to-www.redirectregex.replacement=https://www.serbaserbiumroh.id/$${1}
traefik.http.middlewares.apex-to-www.redirectregex.permanent=true
```

`permanent=true` emits a 301 rather than Vercel's 307, which is the better
signal for a redirect that is never going to change.

---

## 7. Database migrations

Migrations are **not** run by the image. Drizzle Kit is a dev dependency and is
not traced into the standalone output, and a migration inside the container
would race across replicas on every redeploy.

Run them from a machine with the production `DATABASE_URL` before deploying a
release that changes the schema:

```bash
DATABASE_URL='<neon-production-url>' pnpm db:migrate
```

Neon is unchanged by this migration, so nothing needs to run for the move itself
— only for future schema changes.

> If this is forgotten often enough to hurt, the upgrade path is a Coolify
> pre-deployment command against an image that carries `drizzle/` and
> `drizzle-kit`. That costs image weight; do it when the manual step actually
> fails, not before.

---

## 8. Post-deploy verification

Run against the live host. Every line below is a check that has caught a real
regression in this repo.

```bash
BASE=https://www.serbaserbiumroh.id

# Unrouted URLs must 404, not redirect to /login
curl -sI $BASE/halaman-tidak-ada | head -1          # HTTP/2 404

# Public pages
curl -sI $BASE/panduan/panduan-umroh-mandiri | head -1   # 200
curl -sI $BASE/visa | head -1                            # 200

# Private pages still gated
curl -sI $BASE/dashboard | head -1                  # 307 → /login

# The guides are in the sitemap (needs outputFileTracingIncludes)
curl -s $BASE/sitemap.xml | grep -c 'panduan/'      # ≥ 1

# Social cards render
curl -sI $BASE/opengraph-image | grep -i content-type   # image/png

# Apex redirects to www, permanently
curl -sI https://serbaserbiumroh.id/ | head -1      # 301

# The WhatsApp group links survived the build
curl -s $BASE/komunitas | grep -c 'chat.whatsapp.com'   # > 0
```

That last one is the check for §1's silent failure. If it returns `0`, the
`NEXT_PUBLIC_SSU_GROUP_URL_*` build arguments did not reach `next build`.

---

## 9. Known limits

- **ISR cache is ephemeral.** `revalidate = 3600` on `app/sitemap.ts`,
  `/hotel-nusuk` and `/hotel-nusuk/[slug]` writes to the container filesystem.
  It is wiped on every redeploy and is not shared between replicas. Fine at one
  instance; needs a shared cache handler if the app is ever scaled out.
- **No health check is configured.** Coolify's default TCP check on port 3000
  will pass before the app can serve a request.
- **Search Console** verification is an HTML tag in `lib/seo/metadata.ts` and is
  host-based, so it survives the move. The property covers
  `https://www.serbaserbiumroh.id` only — not the apex, not
  `visa.serbaserbiumroh.id`.

---

## 10. Rollback

Coolify keeps previous deployments. Roll back from the application's Deployments
tab. If the whole migration needs reverting, repoint the Hostinger DNS records
at Vercel — keep that project un-deleted until the Coolify deployment has been
stable for a full crawl cycle.
