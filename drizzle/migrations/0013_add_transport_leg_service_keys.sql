-- Transport becomes five directional legs, plus muthowif.
--
-- Values are appended, never inserted: Postgres adds an enum value without rewriting the
-- dependent columns but cannot drop one, so the retiring TRANSPORT key stays in the type and is
-- retired at the application layer instead.
--
-- Apply this on its own, before anything writes the new values: a value added by ALTER TYPE
-- cannot be referenced by the same transaction, and drizzle's migrate path wraps a migration in
-- one -- so seeding the new service_fees rows has to be a separate step (pnpm seed, or the
-- production sync script).
ALTER TYPE "public"."service_key" ADD VALUE 'TRANSPORT_JED_MAKKAH';--> statement-breakpoint
ALTER TYPE "public"."service_key" ADD VALUE 'TRANSPORT_JED_MADINAH';--> statement-breakpoint
ALTER TYPE "public"."service_key" ADD VALUE 'TRANSPORT_MAKKAH_MADINAH';--> statement-breakpoint
ALTER TYPE "public"."service_key" ADD VALUE 'TRANSPORT_MAKKAH_JED';--> statement-breakpoint
ALTER TYPE "public"."service_key" ADD VALUE 'TRANSPORT_MADINAH_JED';--> statement-breakpoint
ALTER TYPE "public"."service_key" ADD VALUE 'MUTHOWIF';