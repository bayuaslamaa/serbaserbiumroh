ALTER TABLE "hotel_prices" ADD COLUMN "import_key" text;--> statement-breakpoint
UPDATE "hotel_prices"
SET "import_key" = "city"::text || ':' || "tier"::text || ':' || regexp_replace(lower(trim("label")), '[[:space:]]+', ' ', 'g')
WHERE "import_key" IS NULL;--> statement-breakpoint
ALTER TABLE "hotel_prices" ALTER COLUMN "import_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_prices" ADD CONSTRAINT "hotel_prices_import_key_unique" UNIQUE("import_key");
