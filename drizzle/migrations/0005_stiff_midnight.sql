CREATE TABLE IF NOT EXISTS "airline_monthly_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"airline_price_id" text NOT NULL,
	"month" integer NOT NULL,
	"idr" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "airline_monthly_prices_airline_price_id_month_unique" UNIQUE("airline_price_id","month")
);
--> statement-breakpoint
ALTER TABLE "airline_prices" ADD COLUMN "import_key" text;--> statement-breakpoint
UPDATE "airline_prices"
SET "import_key" = "tier"::text || ':' || regexp_replace(lower(trim("label")), '[[:space:]]+', ' ', 'g')
WHERE "import_key" IS NULL;--> statement-breakpoint
ALTER TABLE "airline_prices" ALTER COLUMN "import_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "airline_prices" ADD COLUMN "is_default" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "airline_monthly_prices" ADD CONSTRAINT "airline_monthly_prices_airline_price_id_airline_prices_id_fk" FOREIGN KEY ("airline_price_id") REFERENCES "public"."airline_prices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "airline_prices_default_tier_unique" ON "airline_prices" USING btree ("tier") WHERE "airline_prices"."is_default" = true;--> statement-breakpoint
ALTER TABLE "airline_prices" ADD CONSTRAINT "airline_prices_import_key_unique" UNIQUE("import_key");
