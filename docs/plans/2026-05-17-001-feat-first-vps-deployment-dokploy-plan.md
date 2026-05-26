---
title: "feat: Deploy umroh-planner to VPS using Dokploy and Docker"
type: feat
status: active
date: 2026-05-17
---

# feat: Deploy umroh-planner to VPS using Dokploy and Docker

## Summary

First production deployment of the umroh-planner Next.js 14 app to a VPS using Dokploy (Docker-based self-hosted PaaS). The plan covers: adding Next.js standalone output for a minimal Docker image, writing a multi-stage Dockerfile, provisioning a self-hosted PostgreSQL container with a persistent volume, migrating existing data from Neon, configuring GitHub webhook auto-deploy, and bootstrapping the first admin user. Dokploy's built-in Traefik reverse proxy handles SSL/HTTPS automatically.

---

## Problem Frame

The app runs only in local development, connected to a Neon cloud database. There is no Dockerfile, no `.env.example`, no `.dockerignore`, and no CI/CD pipeline. To serve real users, the app needs a repeatable, production-ready deployment pipeline on a VPS where all infrastructure is self-managed.

---

## Requirements

- R1. App runs in Docker on VPS, accessible via a custom domain with HTTPS (SSL via Traefik)
- R2. PostgreSQL runs in a Docker container with a named persistent volume
- R3. Existing data migrated from Neon to the self-hosted Postgres instance
- R4. All 9 database migrations applied to the production database before the app starts
- R5. Every push to `main` triggers an automatic redeploy via GitHub webhook
- R6. Seed reference data (exchange rates, hotel/airline pricing, FAQs) populated
- R7. First admin user promoted to `role = 'ADMIN'` in the production database
- R8. Google OAuth authorized redirect URI updated to the production domain in Google Cloud Console
- R9. All required environment variables set in Dokploy before first boot

---

## Scope Boundaries

- No automated test runner in the CI pipeline (manual testing only for first deploy)
- No blue-green or canary deployment strategy
- No external monitoring or alerting setup (e.g., Sentry, Grafana)
- No email notification service (no email provider is configured in the codebase)
- No custom backup automation (manual pg_dump runbook only)

### Deferred to Follow-Up Work

- Automated database backups via pg_dump cron: separate ops task after first deploy
- Sentry or similar error tracking: future iteration
- GitHub Actions test-before-deploy gate: after first deploy stabilizes

---

## Context & Research

### Relevant Code and Patterns

- `next.config.mjs` — currently has `serverComponentsExternalPackages: ["pg", "@react-pdf/renderer"]`; needs `output: 'standalone'` added
- `drizzle/migrations/` — 9 sequential SQL migration files (0000–0008); must all be applied before first boot
- `drizzle/migrations/0007_fearless_kinsey_walden.sql` — adds `distance` column to `hotel_prices`; **currently staged but not committed**
- `drizzle/migrations/0008_add_activity_logs.sql` — adds `activity_logs` table; **currently staged but not committed**
- `lib/db/index.ts` — single `pg.Pool` connection via `DATABASE_URL`; works for long-lived Node process
- `lib/db/seed.ts` — idempotent seed using `onConflictDoNothing`; safe to re-run on fresh DB
- `package.json` — pnpm scripts: `build` (`next build`), `start` (`next start`), `db:migrate` (drizzle-kit with dotenv-cli wrapper), `seed`

### External Dependencies Requiring Configuration

| Dependency | Required Env Var(s) | Notes |
|---|---|---|
| PostgreSQL | `DATABASE_URL` | Internal Docker network URL for self-hosted |
| NextAuth v5 | `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` | `AUTH_TRUST_HOST=1` required behind Traefik |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Callback URL must be updated in GCP Console |
| Anthropic Claude | `ANTHROPIC_API_KEY` | SDK reads this automatically from env |
| Node.js | `NODE_ENV=production` | Controls Next.js optimizations |

### Institutional Learnings

- No `docs/solutions/` knowledge base exists yet; these findings are first-deploy discoveries to document after shipping

---

## Key Technical Decisions

- **Self-hosted Postgres over Neon**: User preference for full control; requires a Postgres container, named volume, and one-time data migration from Neon. Backup strategy must be set up separately.
- **`output: 'standalone'`**: Minimizes Docker image by emitting only the files needed by `next start`. Next.js traces `pg` and `@react-pdf/renderer` (listed in `serverComponentsExternalPackages`) into `.next/standalone/node_modules/` automatically; the Dockerfile runner stage does **not** need to copy the full `node_modules`.
- **`AUTH_TRUST_HOST=1`**: NextAuth v5 behind Dokploy's Traefik reverse proxy will misroute OAuth callback URLs without this env var. Must be set before the first sign-in attempt.
- **GitHub webhook auto-deploy**: Configured via Dokploy service settings; Dokploy generates a webhook URL to register in GitHub repo → Settings → Webhooks. Triggers on push to `main`.
- **Migrations as a manual pre-deploy step**: No auto-migration on startup; run `npx drizzle-kit migrate` via Dokploy's container console after provisioning the DB. The `db:migrate` pnpm script uses `dotenv-cli` (reads `.env.local`) which does not apply in Docker — run `drizzle-kit` directly with `DATABASE_URL` already in the environment.
- **pnpm in Docker**: The base Docker image (`node:20-alpine`) does not include pnpm. Install it globally in the base stage: `npm install -g pnpm`.
- **Google Fonts at build time**: `next/font/google` downloads and inlines fonts during `next build`; the build container needs outbound internet access to `fonts.googleapis.com`. After build, no Google Fonts network calls at runtime.

---

## Open Questions

### Resolved During Planning

- **Keep Neon or self-host Postgres?**: Self-hosted (user decision)
- **Manual or auto deploy?**: Auto via GitHub webhook (user decision)
- **SSL termination**: Handled by Dokploy's built-in Traefik; no custom Nginx or Certbot setup needed

### Deferred to Implementation

- **Exact Dokploy service/network name for the Postgres container**: Determined when creating the Postgres service in Dokploy UI; use that service name as the hostname in `DATABASE_URL` (e.g., `postgresql://postgres:<pass>@<service-name>:5432/umroh_planner`)
- **pg_dump version compatibility between Neon and self-hosted Postgres**: Verify before restoring; if version mismatch, use `--no-acl --no-owner` flags and `pg_restore` with `--exit-on-error`

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
[GitHub: main branch]
        │ push
        ▼
[GitHub Webhook] ──► [Dokploy]
                          │
                    ┌─────┴──────┐
                    │  Traefik   │  (SSL, domain routing)
                    └─────┬──────┘
                          │
              ┌───────────┴───────────┐
              │                       │
    ┌─────────▼──────────┐  ┌────────▼────────────┐
    │  Next.js container │  │ PostgreSQL container │
    │  (port 3000)       │◄─┤ (port 5432, internal)│
    │  node server.js    │  │ postgres:16-alpine   │
    └────────────────────┘  └─────────────────────┘
                                       │
                               [Named Docker volume]
                               /var/lib/postgresql/data
```

---

## Implementation Units

- U1. **Prepare codebase for Docker production build**

**Goal:** Add `output: 'standalone'` to Next.js config, create `.dockerignore` and `.env.example`, and commit the two pending migrations.

**Requirements:** R1, R4, R9

**Dependencies:** None

**Files:**
- Modify: `next.config.mjs`
- Create: `.dockerignore`
- Create: `.env.example`
- Verify committed: `drizzle/migrations/0007_fearless_kinsey_walden.sql`
- Verify committed: `drizzle/migrations/0008_add_activity_logs.sql`

**Approach:**
- Add `output: 'standalone'` inside the `nextConfig` object in `next.config.mjs`. The existing `serverComponentsExternalPackages` array stays in place — Next.js's standalone trace will include `pg` and `@react-pdf/renderer` automatically.
- Create `.env.example` with all 8 required env vars, placeholder values, and inline comments explaining where each value comes from (GCP Console, Anthropic Console, `openssl rand -base64 32`, etc.).
- Create `.dockerignore` to exclude: `node_modules`, `.next`, `.env.local`, `.env*.local`, `*.csv`, `docs/`, `.git`. Do NOT exclude `drizzle/migrations/` — the migration CLI needs those SQL files at runtime.
- **Critical pre-deploy step**: Commit the two pending migration files (0007, 0008) and merge all current branch changes to `main` before triggering the first Dokploy deploy. If migrations are not in the Docker image, `drizzle-kit migrate` will skip them.

**Test scenarios:**
- Happy path: Run `pnpm run build` locally after adding `output: 'standalone'` — `.next/standalone/server.js` must exist
- Happy path: `.next/standalone/node_modules/pg/` exists after build (verifies pg is traced into standalone output)
- Happy path: `.next/standalone/node_modules/@react-pdf/` exists after build (verifies renderer is traced)
- Edge case: `.env.example` must list `AUTH_TRUST_HOST` with a note that it is required behind a reverse proxy

**Verification:** `pnpm run build` completes, `.next/standalone/server.js` is present, both migration files are committed to `main`.

---

- U2. **Create multi-stage Dockerfile**

**Goal:** Produce a reproducible, minimal Docker image using a 4-stage build that correctly handles pnpm, Google Fonts download at build time, and standalone Next.js output.

**Requirements:** R1

**Dependencies:** U1

**Files:**
- Create: `Dockerfile`

**Approach:**
- **Stage 1 (base)**: `node:20-alpine`. Install pnpm globally via `npm install -g pnpm`.
- **Stage 2 (deps)**: `WORKDIR /app`. Copy `package.json` and `pnpm-lock.yaml`. Run `pnpm install --frozen-lockfile` to reproduce the exact dep tree.
- **Stage 3 (builder)**: Copy `node_modules` from deps stage and all source files. Run `pnpm run build`. This stage requires outbound internet for Google Fonts; no secrets are baked in — all runtime env vars are injected by Dokploy.
- **Stage 4 (runner)**: `node:20-alpine`, `ENV NODE_ENV=production`. Copy `.next/standalone` as `./`, copy `.next/static` → `./.next/static`, copy `public` → `./public`. The standalone output already includes traced `node_modules` for external packages. `EXPOSE 3000`. `CMD ["node", "server.js"]`.

**Patterns to follow:**
- Official Next.js standalone Docker example (next.js/examples/with-docker)
- Existing `serverComponentsExternalPackages` config in `next.config.mjs` — both packages must survive the trace

**Test scenarios:**
- Happy path: `docker build -t umroh-planner .` completes without error on a machine with internet access
- Happy path: `docker run -p 3000:3000 --env-file .env.local umroh-planner` — app serves on localhost:3000
- Integration: PDF export endpoint (`/api/estimate/[id]/export`) returns a valid PDF (proves `@react-pdf/renderer` available at runtime)
- Integration: Any page that hits the DB returns data (proves `pg` available at runtime)
- Edge case: No `.env.local` secrets baked into the image — `docker inspect umroh-planner` must show no secret values in env layer

**Verification:** Image builds cleanly, app runs locally with `.env.local` injected, PDF export and DB queries work.

---

- U3. **Provision Dokploy services: PostgreSQL + Next.js app**

**Goal:** Create and configure both production services in Dokploy with correct networking, environment variables, persistent volume, domain, SSL, and GitHub auto-deploy webhook.

**Requirements:** R1, R2, R5, R8, R9

**Dependencies:** U2

**Files:** *(no repo files — configuration performed in Dokploy UI and Google Cloud Console)*

**Approach:**
- **PostgreSQL service** in Dokploy:
  - Image: `postgres:16-alpine`
  - Env vars: `POSTGRES_DB=umroh_planner`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=<strong random password>`
  - Volume: attach named persistent volume at `/var/lib/postgresql/data`
  - Note the internal service hostname assigned by Dokploy — this becomes the host segment of `DATABASE_URL`
- **Next.js application service** in Dokploy:
  - Source: connect GitHub repo, branch `main`
  - Build method: Dockerfile (Dokploy detects the `Dockerfile` at repo root)
  - Set all env vars (see Requirements table above). `DATABASE_URL` uses the internal Postgres hostname from above
  - Domain: configure the custom domain in Dokploy → enable Let's Encrypt SSL (Traefik handles certificate provisioning automatically)
  - Enable GitHub webhook in Dokploy service settings; Dokploy generates a webhook URL
  - Add that webhook URL to GitHub repo → Settings → Webhooks (content type: `application/json`, event: `push`)
- **Google Cloud Console**: Add `https://<yourdomain>/api/auth/callback/google` as an authorized redirect URI for the OAuth app

**Test scenarios:**
- Happy path: Both services show status "Running" in Dokploy dashboard after initial deploy
- Happy path: Domain resolves via HTTPS with a valid Let's Encrypt certificate
- Happy path: Push a trivial commit to `main` → Dokploy deployments tab shows a new build triggered within ~30 seconds
- Integration: PostgreSQL volume survives a service restart (data persists)
- Error path: Missing `AUTH_TRUST_HOST=1` causes Google OAuth callback to redirect to wrong URL — verify env var is set before first sign-in

**Verification:** Both services healthy, HTTPS domain resolves, GitHub push triggers auto-redeploy.

---

- U4. **Migrate data from Neon to self-hosted PostgreSQL and run all migrations**

**Goal:** Populate the production PostgreSQL container with existing data from Neon and ensure all 9 schema migrations are applied.

**Requirements:** R2, R3, R4

**Dependencies:** U3 (Postgres service must be running)

**Files:** *(no repo files — manual runbook steps)*

**Approach:**
- **Option A — data migration from Neon** (if preserving existing rows):
  1. Export from Neon: `pg_dump "<neon-connection-string>" --no-acl --no-owner -Fc -f neon_backup.dump`
  2. Copy dump file into the Postgres container via Dokploy console or `docker cp`
  3. Restore: `pg_restore --no-acl --no-owner -d umroh_planner neon_backup.dump`
  4. Run any pending migrations not captured in the dump: use Dokploy's container console on the Next.js service: `npx drizzle-kit migrate` (with `DATABASE_URL` already in the environment — do not use the `pnpm db:migrate` pnpm script, which tries to load `.env.local`)
- **Option B — fresh DB** (if no critical data to preserve — likely for first deploy):
  1. From Dokploy's Next.js container console, run: `npx drizzle-kit migrate`
  2. This applies all 9 migrations in sequence on the empty DB
  3. Then run seed (covered in U5)

**Test scenarios:**
- Happy path: `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';` returns 15 tables
- Happy path: `SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;` lists all 9 migration records
- Happy path (Option A): `SELECT COUNT(*) FROM users;` matches row count from Neon before export
- Edge case: Migration 0008 creates `activity_logs` table — confirm it exists; routes that write to this table will 500 silently if missing

**Verification:** All 9 migrations recorded in `__drizzle_migrations`, all 15 tables present.

---

- U5. **Run seed, promote admin user, and smoke test**

**Goal:** Populate reference data, create the first admin account, and verify all critical paths work in production.

**Requirements:** R6, R7

**Dependencies:** U4

**Files:** *(no repo files — post-deploy operations)*

**Approach:**
- **Seed reference data** (if starting fresh): From Dokploy's Next.js container console, run the seed script. Because the pnpm script uses `dotenv-cli`, invoke the seed entry point directly with `DATABASE_URL` in the environment.
- **Create first admin**: Sign in once at the production URL via Google OAuth (or credentials) to create the user row. Then in the Postgres container console: `UPDATE users SET role = 'ADMIN' WHERE email = '<your-email>';`
- **Create ops runbook** (`docs/ops/runbook.md`): document the Dokploy service names, Postgres volume name, manual pg_dump backup command, how to access the Postgres container console, and how to run migrations. Take a first manual backup immediately after the DB is populated and verify it restores to a test Postgres instance.
- **Smoke test checklist** (execute in order, stop and fix before continuing):
  1. Landing page (`/`) loads without auth
  2. `/login` page renders correctly
  3. Google Sign-In completes and redirects to `/dashboard` (tests `AUTH_URL`, `AUTH_TRUST_HOST`, Google callback URI)
  4. Create a new estimate at `/estimate/new` with sample trip details (tests Anthropic API + AI parse)
  5. Export estimate as PDF (tests `@react-pdf/renderer` at runtime)
  6. Sign in as admin and access `/admin/pricing` (tests `role = 'ADMIN'` enforcement)
  7. Push a trivial whitespace commit to `main`, verify new deploy appears in Dokploy within ~1 minute

**Test scenarios:**
- Happy path: All 7 smoke test items pass
- Happy path: Manual pg_dump backup succeeds — `pg_dump "postgresql://postgres:<pass>@<host>:5432/umroh_planner" -Fc -f backup_$(date +%Y%m%d).dump` runs without error and produces a non-empty file
- Error path: Google OAuth redirect fails → check `AUTH_URL`, `AUTH_TRUST_HOST`, and GCP Console authorized URIs
- Error path: PDF export returns 500 → check that `@react-pdf/renderer` is present in the standalone node_modules trace
- Error path: AI parse returns 500 → verify `ANTHROPIC_API_KEY` is set in Dokploy env vars

**Verification:** All smoke test items pass; admin role accessible; auto-deploy confirmed via pushed commit; manual pg_dump backup taken and verified non-empty before the deployment is declared production-ready.

---

## System-Wide Impact

- **Interaction graph**: Internet → Traefik (Dokploy) → Next.js container (port 3000) → PostgreSQL container (port 5432, internal Docker network). GitHub push → GitHub Webhook → Dokploy rebuild → new container replaces old.
- **Error propagation**: Missing `AUTH_SECRET` causes a hard crash at boot. Missing `ANTHROPIC_API_KEY` or `GOOGLE_CLIENT_ID` cause silent failures on first use (not at startup). Missing migrations cause 500 errors on routes that touch missing tables — the app boots successfully even with missing tables.
- **State lifecycle risks**: PostgreSQL data lives in a named Docker volume. Deleting or recreating the Postgres service in Dokploy without preserving the volume destroys all data. Never delete the volume without a backup.
- **API surface parity**: Google OAuth redirect URI must match exactly (`https://` not `http://`, trailing slash matters). Any domain change requires updating GCP Console.
- **Integration coverage**: PDF export (`/api/estimate/[id]/export`) and AI parse (`/api/estimate/parse`) touch external packages and APIs that unit tests do not exercise end-to-end — the smoke test must cover both.
- **Unchanged invariants**: Budget calculation logic, authentication middleware, and admin authorization rules are not modified by this plan.

---

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Migrations 0007/0008 not committed before deploy | Commit both files and merge to `main` as first step (U1); verify in Dokploy build logs |
| `pg` or `@react-pdf/renderer` not traced into standalone output | Verify `.next/standalone/node_modules/pg/` after local build; if missing, add a `COPY --from=builder /app/node_modules ./node_modules` layer to the Dockerfile runner stage |
| `AUTH_TRUST_HOST` not set → OAuth redirect failure behind Traefik | Must be set before first sign-in; make it the first thing checked in smoke test step 3 |
| Neon data migration failure (pg_dump version mismatch) | Use `--no-acl --no-owner` flags; if restore fails, fall back to Option B (fresh DB + seed) since no critical production data exists yet |
| Named Postgres volume accidentally deleted during VPS maintenance | Document volume name after provisioning; set up manual pg_dump backup before real user data accumulates |
| pnpm not found in node:20-alpine base | Explicitly install: `npm install -g pnpm` in Dockerfile base stage |
| Google Fonts download fails during Docker build (network restriction) | Ensure the build environment has outbound internet; fonts are baked in at build time only |
| Domain/SSL not ready before first smoke test | Verify Traefik has issued the Let's Encrypt cert (check Dokploy proxy logs) before testing Google OAuth |

---

## Documentation / Operational Notes

- After first successful deploy, create `docs/ops/runbook.md` capturing: Dokploy service names, Postgres volume name, how to run migrations, how to access the Postgres container console, and backup procedure.
- The seed script (`lib/db/seed.ts`) uses `onConflictDoNothing` — safe to re-run but run it only once on a fresh DB to avoid confusion about data provenance.
- To add a new admin user in future: sign in via the UI to create the user row, then `UPDATE users SET role = 'ADMIN' WHERE email = '...';` from the Postgres container console.
- Future schema changes: commit the new migration file, push to `main`, let auto-deploy rebuild the image, then manually run `npx drizzle-kit migrate` from the Dokploy Next.js container console.

---

## Sources & References

- Related code: `next.config.mjs`, `lib/db/index.ts`, `drizzle/migrations/`, `lib/db/seed.ts`, `package.json`
- NextAuth v5 reverse proxy requirement: `AUTH_TRUST_HOST=1` must be set when behind any proxy that rewrites the `Host` header
- Next.js standalone Docker: official example at `vercel/next.js/examples/with-docker`
- Dokploy: self-hosted Docker PaaS with Traefik reverse proxy built-in (traefik handles Let's Encrypt automatically)
