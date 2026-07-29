ALTER TABLE "real_hotel_prices" DROP CONSTRAINT "real_hotel_prices_hotel_price_id_month_unique";--> statement-breakpoint
ALTER TABLE "real_hotel_prices" ADD COLUMN "room_type" text DEFAULT 'QUAD' NOT NULL;--> statement-breakpoint
ALTER TABLE "real_hotel_prices" ADD CONSTRAINT "real_hotel_prices_hotel_price_id_month_room_type_unique" UNIQUE("hotel_price_id","month","room_type");