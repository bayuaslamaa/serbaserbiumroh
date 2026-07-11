# Operations Runbook

## Service Inventory

Fill in after provisioning in Dokploy:

| Service | Dokploy Name | Internal Hostname | Notes |
|---|---|---|---|
| Next.js app | `umroh-planner` | — | Port 3000, auto-deploy from `main` |
| PostgreSQL | `umroh-planner-db` | `<fill in>` | Port 5432, internal only |
| Volume | `<fill in>` | — | Mounted at `/var/lib/postgresql/data` |

---

## First-Time Deploy (U3–U5)

### Step 1: Provision PostgreSQL in Dokploy

1. Dokploy → New Service → Docker Compose or Manual Docker
2. Image: `postgres:16-alpine`
3. Environment variables:
   ```
   POSTGRES_DB=umroh_planner
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=<strong random password>
   ```
4. Attach a **named persistent volume** at `/var/lib/postgresql/data`
5. Note the internal service hostname (shown in Dokploy network settings) → this is `<postgres-hostname>`

### Step 2: Provision Next.js App in Dokploy

1. Dokploy → New Service → GitHub
2. Connect repo, branch: `main`, build method: Dockerfile
3. Set environment variables (see `.env.example` for reference):
   ```
   DATABASE_URL=postgresql://postgres:<password>@<postgres-hostname>:5432/umroh_planner
   AUTH_SECRET=<openssl rand -base64 32>
   AUTH_URL=https://<your-domain>
   AUTH_TRUST_HOST=1
   GOOGLE_CLIENT_ID=<from GCP Console>
   GOOGLE_CLIENT_SECRET=<from GCP Console>
   ANTHROPIC_API_KEY=<from Anthropic Console>
   NODE_ENV=production
   ```
4. Domain: configure your domain → enable Let's Encrypt SSL
5. Enable GitHub webhook → copy the generated webhook URL

### Step 3: Configure GitHub Webhook

1. GitHub repo → Settings → Webhooks → Add webhook
2. Payload URL: `<Dokploy webhook URL from above>`
3. Content type: `application/json`
4. Events: `push` only
5. Save

### Step 4: Update Google Cloud Console

1. GCP Console → APIs & Services → Credentials → your OAuth 2.0 app
2. Add authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
3. Save

---

## Running Database Migrations

Run from the Dokploy Next.js container console (or via `docker exec`):

```bash
# DATABASE_URL is already in the container environment from Dokploy
npx drizzle-kit migrate
```

Do NOT use `pnpm db:migrate` — it tries to load `.env.local` which doesn't exist in the container.

Verify all 9 migrations applied:
```sql
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

---

## Running the Seed Script

Run from the Dokploy Next.js container console after migrations:

```bash
node -e "
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
" 
# Or use the built-in seed:
npx tsx lib/db/seed.ts
```

Safe to re-run — uses `onConflictDoNothing`.

---

## Promoting the First Admin User

1. Sign in once at `https://<your-domain>` via Google OAuth (creates the user row)
2. In the Postgres container console:
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'bayuaslamaa@gmail.com';
   SELECT email, role FROM users;
   ```

---

## Manual Database Backup

```bash
# From your local machine or the VPS
pg_dump "postgresql://postgres:<password>@<your-domain or VPS IP>:5432/umroh_planner" \
  --no-acl --no-owner -Fc \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# Verify the dump is non-empty
ls -lh backup_*.dump
```

To restore from backup:
```bash
pg_restore --no-acl --no-owner \
  -d "postgresql://postgres:<password>@<host>:5432/umroh_planner" \
  backup_YYYYMMDD_HHMMSS.dump
```

---

## Future Schema Changes

1. Add the new Drizzle migration file under `drizzle/migrations/`
2. Commit and push to `main` (Dokploy auto-deploys)
3. After deploy completes, run migrations manually:
   ```bash
   # In the Dokploy Next.js container console
   npx drizzle-kit migrate
   ```

Hotel booking offer migrations and post-migration verification are documented in [`docs/HOTEL_BOOKING_OFFERS.md`](../HOTEL_BOOKING_OFFERS.md#deployment-checks).

---

## Smoke Test Checklist

Run after every major deploy:

- [ ] `https://<domain>/` — landing page loads without auth
- [ ] `https://<domain>/login` — login page renders
- [ ] Google Sign-In → redirects to `/dashboard`
- [ ] Create new estimate at `/estimate/new`
- [ ] Export estimate as PDF
- [ ] Access `/admin/pricing` as admin user
- [ ] Push a trivial commit to `main` → new build appears in Dokploy within ~1 minute
