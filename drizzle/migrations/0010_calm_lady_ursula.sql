CREATE TYPE "public"."hotel_booking_offer_status" AS ENUM('ACTIVE', 'UNAVAILABLE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_booking_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_listing_id" text,
	"city" "city" NOT NULL,
	"tier" "hotel_tier" NOT NULL,
	"hotel_name" text NOT NULL,
	"offer_label" text DEFAULT '' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"period_label" text DEFAULT '' NOT NULL,
	"room_basis" text NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"price_amount" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"terms" text DEFAULT '' NOT NULL,
	"status" "hotel_booking_offer_status" DEFAULT 'ACTIVE' NOT NULL,
	"import_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_booking_offers_import_key_unique" UNIQUE("import_key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hotel_booking_offers" ADD CONSTRAINT "hotel_booking_offers_hotel_listing_id_hotel_listings_id_fk" FOREIGN KEY ("hotel_listing_id") REFERENCES "public"."hotel_listings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_booking_offers_city_status_idx" ON "hotel_booking_offers" USING btree ("city","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_booking_offers_period_idx" ON "hotel_booking_offers" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_booking_offers_hotel_listing_idx" ON "hotel_booking_offers" USING btree ("hotel_listing_id");
