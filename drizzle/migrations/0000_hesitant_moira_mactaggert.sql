CREATE TYPE "public"."airline_tier" AS ENUM('BUDGET', 'STANDARD', 'GARUDA', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."city" AS ENUM('MAKKAH', 'MADINAH');--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "airline_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"tier" "airline_tier" NOT NULL,
	"idr" integer NOT NULL,
	"label" text NOT NULL,
	"sublabel" text NOT NULL,
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
CREATE TABLE IF NOT EXISTS "hotel_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"city" "city" NOT NULL,
	"tier" "hotel_tier" NOT NULL,
	"sar_per_night" integer NOT NULL,
	"label" text NOT NULL,
	"sublabel" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
