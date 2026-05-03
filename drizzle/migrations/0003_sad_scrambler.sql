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
