CREATE TABLE IF NOT EXISTS "hotel_monthly_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_price_id" text NOT NULL,
	"month" integer NOT NULL,
	"sar_per_night" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_monthly_prices_hotel_price_id_month_unique" UNIQUE("hotel_price_id","month")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hotel_monthly_prices" ADD CONSTRAINT "hotel_monthly_prices_hotel_price_id_hotel_prices_id_fk" FOREIGN KEY ("hotel_price_id") REFERENCES "public"."hotel_prices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
