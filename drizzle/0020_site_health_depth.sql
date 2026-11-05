ALTER TABLE "geo_audit_pages" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "geo_audit_pages" ADD COLUMN "meta_description" text;--> statement-breakpoint
ALTER TABLE "geo_audit_pages" ADD COLUMN "speed_metrics" jsonb;