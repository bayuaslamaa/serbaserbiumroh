ALTER TABLE "hotel_prices" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "hotel_prices" ADD CONSTRAINT "hotel_prices_slug_unique" UNIQUE("slug");