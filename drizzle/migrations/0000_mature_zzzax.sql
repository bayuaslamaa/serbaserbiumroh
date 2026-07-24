CREATE TYPE "public"."airline_tier" AS ENUM('BUDGET', 'STANDARD', 'GARUDA', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."city" AS ENUM('MAKKAH', 'MADINAH');--> statement-breakpoint
CREATE TYPE "public"."community_join_request_status" AS ENUM('NEW', 'MATCHED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."hotel_tier" AS ENUM('ECONOMY', 'STANDARD', 'PELATARAN', 'PREMIUM');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."service_key" AS ENUM('VISA', 'SISKOPATUH', 'TASREH', 'TRANSPORT', 'TOUR_MAKKAH', 'TOUR_MADINAH');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"flow" text NOT NULL,
	"event" text NOT NULL,
	"status" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "airline_monthly_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"airline_price_id" text NOT NULL,
	"month" integer NOT NULL,
	"idr" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "airline_monthly_prices_airline_price_id_month_unique" UNIQUE("airline_price_id","month")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "airline_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"tier" "airline_tier" NOT NULL,
	"import_key" text NOT NULL,
	"idr" integer NOT NULL,
	"label" text NOT NULL,
	"sublabel" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "airline_prices_import_key_unique" UNIQUE("import_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_join_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"normalized_phone" text NOT NULL,
	"social_username" text,
	"normalized_social_username" text,
	"intent" text,
	"status" "community_join_request_status" DEFAULT 'NEW' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estimates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"raw_input" text NOT NULL,
	"ai_notes" text,
	"params" jsonb NOT NULL,
	"manual_overrides" jsonb,
	"total_idr_pax" integer NOT NULL,
	"total_idr_grp" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"currency" text NOT NULL,
	"rate_to_idr" integer NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faq_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faq_items" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"city" "city" NOT NULL,
	"tier" "hotel_tier" NOT NULL,
	"distance_meters" integer,
	"facilities" text DEFAULT '' NOT NULL,
	"pilgrim_notes" text DEFAULT '' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_monthly_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_price_id" text NOT NULL,
	"month" integer NOT NULL,
	"sar_per_night" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_monthly_prices_hotel_price_id_month_unique" UNIQUE("hotel_price_id","month")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"city" "city" NOT NULL,
	"tier" "hotel_tier" NOT NULL,
	"import_key" text NOT NULL,
	"sar_per_night" integer NOT NULL,
	"label" text NOT NULL,
	"sublabel" text NOT NULL,
	"distance" text,
	"agoda_url" text,
	"bookingcom_url" text,
	"tripcom_url" text,
	"booking_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_prices_import_key_unique" UNIQUE("import_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pilgrim_stories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"author_name" text NOT NULL,
	"departure_city" text NOT NULL,
	"travel_month" integer,
	"travel_year" integer,
	"pax" integer NOT NULL,
	"hotel_tier" "hotel_tier" NOT NULL,
	"airline_tier" "airline_tier",
	"makkah_nights" integer NOT NULL,
	"madinah_nights" integer NOT NULL,
	"total_budget_idr" bigint NOT NULL,
	"narrative" text DEFAULT '' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pilgrim_stories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room_multipliers" (
	"type" text PRIMARY KEY NOT NULL,
	"pax_per_room" integer NOT NULL,
	"multiplier" text NOT NULL,
	"label" text NOT NULL,
	"sublabel" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_fees" (
	"id" text PRIMARY KEY NOT NULL,
	"key" "service_key" NOT NULL,
	"currency" text NOT NULL,
	"amount" integer NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"divide_by_pax" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_fees_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_itinerary_days" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"day_number" integer NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_packing_items" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"category" text NOT NULL,
	"item_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password" text,
	"role" "role" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visitor_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"user_agent" text,
	"path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "airline_monthly_prices" ADD CONSTRAINT "airline_monthly_prices_airline_price_id_airline_prices_id_fk" FOREIGN KEY ("airline_price_id") REFERENCES "public"."airline_prices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_join_requests" ADD CONSTRAINT "community_join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "estimates" ADD CONSTRAINT "estimates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_group_id_faq_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."faq_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hotel_monthly_prices" ADD CONSTRAINT "hotel_monthly_prices_hotel_price_id_hotel_prices_id_fk" FOREIGN KEY ("hotel_price_id") REFERENCES "public"."hotel_prices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_itinerary_days" ADD CONSTRAINT "story_itinerary_days_story_id_pilgrim_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."pilgrim_stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_packing_items" ADD CONSTRAINT "story_packing_items_story_id_pilgrim_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."pilgrim_stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "airline_prices_default_tier_unique" ON "airline_prices" USING btree ("tier") WHERE "airline_prices"."is_default" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_join_requests_normalized_phone_idx" ON "community_join_requests" USING btree ("normalized_phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_join_requests_normalized_social_idx" ON "community_join_requests" USING btree ("normalized_social_username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_join_requests_status_created_at_idx" ON "community_join_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_logs_ip_hash_idx" ON "visitor_logs" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_logs_created_at_idx" ON "visitor_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_logs_path_idx" ON "visitor_logs" USING btree ("path");