ALTER TABLE "hotel_booking_offers" ADD COLUMN IF NOT EXISTS "room_type" text DEFAULT 'Standard Room' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_booking_offers" ADD COLUMN IF NOT EXISTS "rate_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_booking_offers" ADD COLUMN IF NOT EXISTS "max_adults" integer;--> statement-breakpoint
ALTER TABLE "hotel_booking_offers" ADD COLUMN IF NOT EXISTS "max_guests" integer;--> statement-breakpoint
ALTER TABLE "hotel_booking_offers" ADD COLUMN IF NOT EXISTS "min_nights" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_booking_offers" ADD COLUMN IF NOT EXISTS "inclusions" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_booking_offers" ADD COLUMN IF NOT EXISTS "cancellation_policy" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_booking_offers" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_booking_offers" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_booking_offers_status_window_idx" ON "hotel_booking_offers" USING btree ("status","period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_booking_offers_sort_idx" ON "hotel_booking_offers" USING btree ("sort_order","hotel_name");
