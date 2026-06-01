CREATE TYPE "public"."community_join_request_status" AS ENUM('NEW', 'MATCHED', 'REJECTED');--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "visitor_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"user_agent" text,
	"path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "community_join_requests_normalized_phone_idx" ON "community_join_requests" USING btree ("normalized_phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_join_requests_normalized_social_idx" ON "community_join_requests" USING btree ("normalized_social_username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_join_requests_status_created_at_idx" ON "community_join_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_logs_ip_hash_idx" ON "visitor_logs" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_logs_created_at_idx" ON "visitor_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_logs_path_idx" ON "visitor_logs" USING btree ("path");