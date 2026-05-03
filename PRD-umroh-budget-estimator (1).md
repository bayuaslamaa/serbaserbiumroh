# PRD: Umroh Budget Estimator
**Product Requirements Document — Full-Stack Next.js / TypeScript**
Version 1.0 | April 2026

---

## 1. Overview

### 1.1 Product Summary
A full-stack web application that allows travel agents and individual pilgrims to generate accurate Umroh trip cost estimations using natural language input (Bahasa Indonesia / English). The AI parses free-form trip descriptions, extracts structured parameters, and produces an itemized budget breakdown per person and per group.

### 1.2 Goals
- Allow users to describe an Umroh itinerary in natural language and receive an instant budget estimation
- Allow manual fine-tuning of all extracted parameters
- Store and manage multiple estimation sessions
- Export estimates as PDF / WhatsApp-friendly summary
- Admin panel to update pricing data (hotel rates, airline prices, exchange rates, services)

### 1.3 Non-Goals (v1)
- Payment processing
- Booking / reservation integration
- Multi-language UI (Indonesian is primary)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Drizzle ORM |
| Auth | NextAuth.js (credentials + Google OAuth) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Deployment | Vercel (recommended) |
| Package Manager | pnpm |

---

## 3. Data Models

All schemas live in `lib/db/schema.ts`. Drizzle uses plain TypeScript — no DSL file.

### 3.1 Pricing Configuration (managed by admin)

```typescript
// lib/db/schema.ts
import { pgTable, text, integer, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// --- Enums ---
export const cityEnum        = pgEnum("city",         ["MAKKAH", "MADINAH"])
export const hotelTierEnum   = pgEnum("hotel_tier",   ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"])
export const airlineTierEnum = pgEnum("airline_tier", ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"])
export const serviceKeyEnum  = pgEnum("service_key",  ["VISA", "SISKOPATUH", "TASREH", "TRANSPORT", "TOUR_MAKKAH", "TOUR_MADINAH"])
export const roleEnum        = pgEnum("role",         ["USER", "ADMIN"])

// --- Exchange Rates ---
export const exchangeRates = pgTable("exchange_rates", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  currency:  text("currency").notNull(),           // "SAR" | "USD"
  rateToIdr: integer("rate_to_idr").notNull(),     // e.g. SAR=4700, USD=17300
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- Hotel Prices (per room/night, SAR, fullboard included) ---
export const hotelPrices = pgTable("hotel_prices", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  city:        cityEnum("city").notNull(),
  tier:        hotelTierEnum("tier").notNull(),
  sarPerNight: integer("sar_per_night").notNull(),
  label:       text("label").notNull(),            // e.g. "Safwa Tower 3"
  sublabel:    text("sublabel").notNull(),         // e.g. "3★, dekat Haram"
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
})

// --- Airline Prices (IDR, per person round-trip) ---
export const airlinePrices = pgTable("airline_prices", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  tier:      airlineTierEnum("tier").notNull(),
  idr:       integer("idr").notNull(),
  label:     text("label").notNull(),              // e.g. "Lion Air, AirAsia"
  sublabel:  text("sublabel").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- Service Fees ---
export const serviceFees = pgTable("service_fees", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  key:       serviceKeyEnum("key").notNull().unique(),
  currency:  text("currency").notNull(),           // "SAR" | "IDR" | "USD"
  amount:    integer("amount").notNull(),
  label:     text("label").notNull(),
  enabled:   boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
```

### 3.2 Room Multipliers (seeded, not admin-editable in v1)

```typescript
// Stored as seed data in the same schema file
export const roomMultipliers = pgTable("room_multipliers", {
  type:       text("type").primaryKey(),           // "QUAD" | "TRIPLE" | "DOUBLE" | "SINGLE"
  paxPerRoom: integer("pax_per_room").notNull(),   // 4 | 3 | 2 | 1
  multiplier: text("multiplier").notNull(),        // stored as string e.g. "1.25" to avoid float issues
  label:      text("label").notNull(),
  sublabel:   text("sublabel").notNull(),
})
```

### 3.3 User & Estimates

```typescript
// --- Users ---
export const users = pgTable("users", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  name:      text("name").notNull(),
  email:     text("email").notNull().unique(),
  password:  text("password"),                     // hashed, null for OAuth users
  role:      roleEnum("role").notNull().default("USER"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// --- Estimates ---
export const estimates = pgTable("estimates", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:       text("title"),                      // auto-generated or user-named
  rawInput:    text("raw_input").notNull(),         // original natural language input
  aiNotes:     text("ai_notes"),                   // AI parsing notes/ambiguity flags
  params:      jsonb("params").notNull(),           // EstimateParams snapshot
  totalIdrPax: integer("total_idr_pax").notNull(), // per person total at time of save
  totalIdrGrp: integer("total_idr_grp").notNull(), // group total at time of save
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
})

// --- Inferred types (use these throughout the app) ---
export type ExchangeRate  = typeof exchangeRates.$inferSelect
export type HotelPrice    = typeof hotelPrices.$inferSelect
export type AirlinePrice  = typeof airlinePrices.$inferSelect
export type ServiceFee    = typeof serviceFees.$inferSelect
export type User          = typeof users.$inferSelect
export type Estimate      = typeof estimates.$inferSelect
export type NewEstimate   = typeof estimates.$inferInsert
```

### 3.4 TypeScript Interfaces

```typescript
// Enums
type City        = "MAKKAH" | "MADINAH"
type HotelTier   = "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
type RoomType    = "QUAD" | "TRIPLE" | "DOUBLE" | "SINGLE"
type AirlineTier = "BUDGET" | "STANDARD" | "GARUDA" | "BUSINESS"
type ServiceKey  = "VISA" | "SISKOPATUH" | "TASREH" | "TRANSPORT" | "TOUR_MAKKAH" | "TOUR_MADINAH"

// Core estimation parameters
interface EstimateParams {
  nightsMadinah: number
  nightsMakkah:  number
  pax:           number
  hotelTier:     HotelTier
  roomType:      RoomType
  airline:       AirlineTier
  services:      ServiceKey[]
  fullboard:     boolean
}

// Budget breakdown (computed, not stored directly)
interface BudgetBreakdown {
  hotelMadinahIdr: number
  hotelMakkahIdr:  number
  servicesIdr:     number
  serviceItems:    { key: ServiceKey; label: string; amountDisplay: string; idr: number }[]
  flightIdr:       number
  totalIdrPax:     number
  totalIdrGrp:     number
  sarRate:         number
  usdRate:         number
}
```

---

## 4. API Routes (Next.js App Router)

### 4.1 AI Parsing

```
POST /api/estimate/parse
Body:    { input: string }
Returns: { params: EstimateParams; notes: string }
Auth:    Required (user)
```
- Calls Claude API with structured system prompt
- Returns parsed `EstimateParams` + any ambiguity notes
- Does NOT save to DB — client uses result to populate form

### 4.2 Save Estimate

```
POST /api/estimate
Body:    { rawInput: string; params: EstimateParams; aiNotes?: string; title?: string }
Returns: { estimate: Estimate }
Auth:    Required (user)
```

### 4.3 List Estimates

```
GET /api/estimate?page=1&limit=20
Returns: { estimates: Estimate[]; total: number }
Auth:    Required (user) — returns own estimates only
```

### 4.4 Get / Update / Delete Estimate

```
GET    /api/estimate/[id]
PATCH  /api/estimate/[id]   Body: { params?: EstimateParams; title?: string }
DELETE /api/estimate/[id]
Auth:  Required (owner or admin)
```

### 4.5 Pricing Config (Admin only)

```
GET   /api/admin/pricing          — returns all current pricing rows
PATCH /api/admin/pricing/rates    Body: { currency: string; rateToIdr: number }
PATCH /api/admin/pricing/hotel    Body: { city; tier; sarPerNight }
PATCH /api/admin/pricing/airline  Body: { tier; idr }
PATCH /api/admin/pricing/service  Body: { key; currency; amount; enabled }
Auth: Admin only
```

### 4.6 Export

```
GET /api/estimate/[id]/export?format=pdf|whatsapp
Returns: PDF binary OR plain text WhatsApp summary
Auth: Required (owner or admin)
```

---

## 5. Pages & UI

### 5.1 Page Structure

```
/                    → Redirect to /dashboard (if logged in) or /login
/login               → Login page (email/password + Google)
/dashboard           → List of saved estimates + "New Estimate" CTA
/estimate/new        → Main estimator page (input → parse → adjust → save)
/estimate/[id]       → View / edit saved estimate
/admin/pricing       → Admin: update exchange rates, hotel, airline, services
/admin/users         → Admin: manage users
```

### 5.2 Main Estimator Page (`/estimate/new`)

**Layout:** Two-column on desktop, single column on mobile.

**Left column — Input & Parameters:**
1. **Natural language textarea** — user types trip description
2. **Example chips** — pre-fill with example requests
3. **"Hitung Estimasi" button** — triggers AI parse
4. **Parameter panel** (populated after parse, all editable):
   - Nights in Madinah / Makkah — stepper
   - Number of pilgrims (pax) — stepper
   - Hotel tier — radio card grid (Economy / Standard / Pelataran / Premium), showing SAR/night
   - Room type — radio card grid (Quad / Triple / Double / Single)
   - Airline — radio card grid (Budget / Standard / Garuda / Business), showing IDR PP
   - Services — checkbox grid (Visa, Siskopatuh, Tasreh, Transport, Tour Makkah, Tour Madinah)
5. **Save button** — saves to DB with optional title

**Right column — Budget Breakdown:**
- Itemized rows: Hotel Madinah, Hotel Makkah, each service, flight
- Each row shows native currency (SAR/USD/IDR) + IDR equivalent
- **Total per person** (large, prominent)
- **Total for group** (if pax > 1) with group total box
- Trip summary badge (nights, tier, room, airline)
- Footer: exchange rates used + disclaimer

**AI notes banner** — shown if AI flagged ambiguity (e.g. "tanggal tidak jelas, asumsi 9 malam Makkah")

### 5.3 Dashboard (`/dashboard`)

- Cards for each saved estimate showing: title, date, nights, pax, total IDR, hotel tier
- Search / filter by date
- Quick actions: view, duplicate, delete
- "Buat Estimasi Baru" primary CTA

### 5.4 Admin Pricing Panel (`/admin/pricing`)

- **Exchange Rates** table: SAR rate, USD rate — inline edit + save
- **Hotel Prices** table: grouped by city × tier — inline SAR/night edit
- **Airline Prices** table: tier × IDR — inline edit
- **Service Fees** table: key, currency, amount, enabled toggle — inline edit
- All changes logged with timestamp + user
- "Perubahan tersimpan" toast on success

---

## 6. AI Parsing — System Prompt Spec

### 6.1 Endpoint
`POST https://api.anthropic.com/v1/messages`
Model: `claude-sonnet-4-20250514`
Max tokens: 800

### 6.2 System Prompt

```
You are an Umroh trip cost extraction assistant. Parse the user's request (Indonesian/English) and return ONLY a raw JSON object — no markdown, no backticks, no explanation.

JSON schema:
{
  "nightsMadinah": integer,
  "nightsMakkah": integer,
  "pax": integer,
  "hotelTier": "ECONOMY"|"STANDARD"|"PELATARAN"|"PREMIUM",
  "roomType": "QUAD"|"TRIPLE"|"DOUBLE"|"SINGLE",
  "airline": "BUDGET"|"STANDARD"|"GARUDA"|"BUSINESS",
  "services": ["VISA","SISKOPATUH","TASREH","TRANSPORT","TOUR_MAKKAH","TOUR_MADINAH"],
  "fullboard": boolean,
  "notes": string
}

Extraction rules:
- "pelataran"/"dekat masjid"/"pinggir masjid" → hotelTier: "PELATARAN"
- "Garuda"/"direct"/"langsung" → airline: "GARUDA"
- "lion air"/"air asia"/"budget" → airline: "BUDGET"
- If date range given (e.g. "15-25 Sept"), compute nights = end - start per city
- If total days only, split evenly unless ratio stated
- Default services always included: ["VISA","SISKOPATUH","TRANSPORT"]
- "tour" / "tour makkah & madinah" → add TOUR_MAKKAH + TOUR_MADINAH
- "tasreh" / "raudhah" → add TASREH
- "siskopatuh" → ensure SISKOPATUH in services
- "fullboard"/"FB"/"full board"/"3x makan" → fullboard: true
- pax default 1 if unspecified

Defaults:
nightsMadinah=4, nightsMakkah=9, pax=1,
hotelTier="STANDARD", roomType="QUAD", airline="STANDARD", fullboard=true

In "notes", flag any assumptions made or ambiguities found. Return empty string if none.
```

### 6.3 Server-Side Pricing Injection
Before calling the AI, the server fetches current pricing from DB and injects a pricing context block into the system prompt (so the AI can include approximate totals in notes if needed). The structured params are always returned regardless.

---

## 7. Budget Calculation Logic

All calculation happens server-side in a pure TypeScript function:

```typescript
function calculateBudget(
  params: EstimateParams,
  pricing: PricingConfig   // fetched from DB
): BudgetBreakdown {

  const sarRate = pricing.rates.SAR  // e.g. 4700
  const usdRate = pricing.rates.USD  // e.g. 17300

  const hotel = (city: City) => pricing.hotels[city][params.hotelTier].sarPerNight
  const room  = ROOM_MULTIPLIERS[params.roomType]  // { pax, multiplier }

  const hotelMadinahSar = (hotel("MADINAH") * params.nightsMadinah * room.multiplier) / room.pax
  const hotelMakkahSar  = (hotel("MAKKAH")  * params.nightsMakkah  * room.multiplier) / room.pax
  const hotelMadinahIdr = Math.round(hotelMadinahSar * sarRate)
  const hotelMakkahIdr  = Math.round(hotelMakkahSar  * sarRate)

  const serviceItems = params.services.map(key => {
    const svc = pricing.services[key]
    const idr =
      svc.currency === "SAR" ? Math.round(svc.amount * sarRate) :
      svc.currency === "USD" ? Math.round(svc.amount * usdRate) :
      svc.amount  // IDR already
    const amountDisplay =
      svc.currency === "USD" ? `$${svc.amount}` :
      svc.currency === "IDR" ? `Rp ${svc.amount.toLocaleString("id-ID")}` :
      `SAR ${svc.amount}`
    return { key, label: svc.label, amountDisplay, idr }
  })

  const flightIdr   = pricing.airlines[params.airline].idr
  const servicesIdr = serviceItems.reduce((s, i) => s + i.idr, 0)
  const totalIdrPax = hotelMadinahIdr + hotelMakkahIdr + servicesIdr + flightIdr
  const totalIdrGrp = totalIdrPax * params.pax

  return {
    hotelMadinahIdr, hotelMakkahIdr,
    servicesIdr, serviceItems,
    flightIdr,
    totalIdrPax, totalIdrGrp,
    sarRate, usdRate
  }
}
```

This function is exposed via a Server Action and also used in the export API.

---

## 8. Seed Data (Initial Pricing)

### Exchange Rates
| Currency | Rate to IDR |
|---|---|
| SAR | 4,700 |
| USD | 17,300 |

### Hotel Prices (SAR/room/night, Fullboard included)

| Tier | Madinah | Makkah | Label (Madinah / Makkah) |
|---|---|---|---|
| Economy | 450 | 800 | 2-3★, ±1km Nabawi / 2-3★, jauh Haram |
| Standard | 650 | 1,300 | Grand Plaza Badr Maqam / Safwa Tower 3 |
| Pelataran | 2,000 | 3,500 | Pelataran Masjid Nabawi / Pelataran Masjidil Haram |
| Premium | 3,500 | 6,000 | Bintang 5 pelataran / Bintang 5 pelataran |

### Room Multipliers (seeded, not editable)

| Type | Pax/Kamar | Multiplier |
|---|---|---|
| Quad | 4 | 1.0× |
| Triple | 3 | 1.25× |
| Double | 2 | 1.5× |
| Single | 1 | 2.8× |

### Airline Prices (IDR PP Round-Trip)

| Tier | IDR | Label |
|---|---|---|
| Budget | 12,500,000 | Lion Air, AirAsia (transit) |
| Standard | 14,500,000 | Batik Air, Saudia (~14jt+) |
| Garuda | 17,000,000 | Garuda Indonesia (direct) |
| Business | 25,000,000 | Business Class |

### Service Fees

| Key | Currency | Amount | Label |
|---|---|---|---|
| VISA | USD | 165 | Visa Umroh Reguler |
| SISKOPATUH | IDR | 200,000 | Siskopatuh |
| TASREH | SAR | 25 | Tasreh Raudhah |
| TRANSPORT | SAR | 325 | Transportasi Full Rute (Staria) |
| TOUR_MAKKAH | SAR | 150 | Tour Ziarah Makkah |
| TOUR_MADINAH | SAR | 150 | Tour Ziarah Madinah |

---

## 9. Export Feature

### 9.1 PDF Export
- Use `@react-pdf/renderer` or `puppeteer` (headless) to render estimate as branded PDF
- Includes: pilgrim name (if set), itinerary summary, full itemized breakdown, disclaimer, generation date
- Branding: Islamic geometric motif header, gold/green color scheme

### 9.2 WhatsApp Text Export
- Plain text format optimized for WhatsApp sharing
- Format:
```
🕋 *ESTIMASI BIAYA UMROH*
━━━━━━━━━━━━━━━━━
📅 Madinah: {n} malam | Makkah: {n} malam
👥 Jamaah: {pax} orang ({roomType})
🏨 Hotel: {tier}
✈️ Pesawat: {airline}

💰 *RINCIAN PER ORANG*
Hotel Madinah:  Rp {x}
Hotel Makkah:   Rp {x}
Visa:           $165 ≈ Rp {x}
Siskopatuh:     Rp 200.000
Transport:      SAR 325 ≈ Rp {x}
Pesawat:        Rp {x}
━━━━━━━━━━━━━━━━━
*TOTAL/ORANG:   Rp {x}*
{if pax > 1: TOTAL GRUP ({n} org): Rp {x}}

Kurs: SAR 4.700 · USD 17.300
⚠️ Estimasi, belum termasuk biaya lainnya.
```

---

## 10. Authentication & Authorization

| Role | Permissions |
|---|---|
| USER | Create/read/update/delete own estimates, export |
| ADMIN | All USER permissions + manage all estimates + pricing admin panel + user management |

- Session via NextAuth.js JWT strategy
- Google OAuth + email/password (bcrypt)
- Protected routes via Next.js middleware

---

## 11. Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Anthropic
ANTHROPIC_API_KEY="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Drizzle Config (`drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema:    "./lib/db/schema.ts",
  out:       "./drizzle/migrations",
  dialect:   "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

### Drizzle Client Singleton (`lib/db/index.ts`)

```typescript
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool }    from "pg"
import * as schema from "./schema"

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
export const db = drizzle(pool, { schema })
export type DB = typeof db
```

### Common Query Patterns

```typescript
import { db }    from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { estimates, hotelPrices, exchangeRates } from "@/lib/db/schema"

// Select all rates
const rates = await db.select().from(exchangeRates)

// Get hotel prices for a city
const hotels = await db.select().from(hotelPrices).where(eq(hotelPrices.city, "MAKKAH"))

// Insert estimate
const [saved] = await db.insert(estimates).values(newEstimate).returning()

// Update a rate
await db.update(exchangeRates)
  .set({ rateToIdr: 4700, updatedAt: new Date() })
  .where(eq(exchangeRates.currency, "SAR"))

// List user's estimates, newest first
const list = await db.select().from(estimates)
  .where(eq(estimates.userId, userId))
  .orderBy(desc(estimates.createdAt))
  .limit(20).offset((page - 1) * 20)
```

---

## 12. Project Structure

```
umroh-estimator/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── estimate/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── layout.tsx
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── pricing/page.tsx
│   │   │   └── users/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── estimate/
│   │   │   ├── route.ts                 (GET list, POST create)
│   │   │   ├── [id]/route.ts            (GET, PATCH, DELETE)
│   │   │   ├── [id]/export/route.ts     (GET pdf/whatsapp)
│   │   │   └── parse/route.ts           (POST AI parse)
│   │   └── admin/
│   │       └── pricing/route.ts
│   └── layout.tsx
├── components/
│   ├── estimator/
│   │   ├── InputPanel.tsx
│   │   ├── ParamsPanel.tsx
│   │   ├── BudgetBreakdown.tsx
│   │   ├── ServiceCheckboxGrid.tsx
│   │   ├── RadioCardGrid.tsx
│   │   └── Stepper.tsx
│   ├── dashboard/
│   │   ├── EstimateCard.tsx
│   │   └── EstimateList.tsx
│   ├── admin/
│   │   ├── PricingTable.tsx
│   │   └── InlineEditCell.tsx
│   └── ui/                              (shadcn/ui components)
├── lib/
│   ├── db/
│   │   ├── index.ts                         (Drizzle client singleton)
│   │   ├── schema.ts                        (all table + enum definitions)
│   │   └── seed.ts                          (seed pricing data)
│   ├── ai/
│   │   ├── parse.ts                     (Claude API call + prompt)
│   │   └── prompt.ts                    (system prompt builder)
│   ├── budget/
│   │   └── calculate.ts                 (pure calculation function)
│   ├── export/
│   │   ├── pdf.ts
│   │   └── whatsapp.ts
│   └── auth.ts                          (NextAuth config)
├── drizzle/
│   └── migrations/                          (generated by drizzle-kit)
├── types/
│   └── index.ts                         (all shared TypeScript types)
├── middleware.ts                         (auth protection)
├── .env.local
└── package.json
```

---

## 13. Development Checklist

### Phase 1 — Foundation
- [ ] Init Next.js 14 project with TypeScript + Tailwind + shadcn/ui
- [ ] Drizzle schema (`lib/db/schema.ts`) + `drizzle-kit generate` + `drizzle-kit migrate`
- [ ] Seed script (`lib/db/seed.ts`) with all pricing data
- [ ] NextAuth setup (credentials + Google)
- [ ] Middleware for route protection

### Phase 2 — Core Feature
- [ ] `POST /api/estimate/parse` — Claude integration
- [ ] Budget calculation function (`lib/budget/calculate.ts`)
- [ ] `/estimate/new` page — full UI (input → parse → params → breakdown → save)
- [ ] `POST /api/estimate` — save endpoint

### Phase 3 — Dashboard
- [ ] `/dashboard` page with estimate cards
- [ ] `GET /api/estimate` — list with pagination
- [ ] `/estimate/[id]` — view + edit saved estimate
- [ ] Duplicate estimate action

### Phase 4 — Admin
- [ ] `/admin/pricing` — inline edit all pricing rows
- [ ] `PATCH /api/admin/pricing/*` endpoints
- [ ] Change log display

### Phase 5 — Export
- [ ] WhatsApp text export
- [ ] PDF export
- [ ] `GET /api/estimate/[id]/export` endpoint

---

## 14. UI Design Tokens

```css
/* Islamic aesthetic — dark green / gold */
--color-bg:         #0b1c12;
--color-surface:    rgba(255,255,255,0.03);
--color-border:     rgba(201,168,76,0.18);
--color-gold:       #c9a84c;
--color-gold-muted: rgba(201,168,76,0.5);
--color-green:      #2c6b42;
--color-green-text: #7a9e84;
--color-text:       #f0ece0;
--color-text-muted: #9ab39e;
--font-heading:     'Amiri', serif;        /* Arabic-style serif */
--font-body:        'DM Sans', sans-serif;
```

---

## 15. Key Business Rules

1. **Hotel price = per kamar per malam** → divide by pax/kamar, multiply by room multiplier
2. **Fullboard included** in all hotel prices (no separate meal line item)
3. **Service fees are per person** (pax-based), not per room
4. **Flight price is per person round-trip** (already PP, no division needed)
5. **Mixed currency services**: Visa in USD, Siskopatuh in IDR, others in SAR — all converted to IDR for totals
6. **Exchange rates stored in DB** — admin can update anytime, all future calculations use latest rates
7. **Saved estimates snapshot** the totals at time of saving — changes to pricing do not retroactively update saved estimates

---

*Document prepared for use with Claude Code. All pricing figures reflect current rates as of April 2026.*
