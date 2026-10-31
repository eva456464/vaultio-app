ALTER TABLE "agency_reports" ADD COLUMN "html" text;--> statement-breakpoint
ALTER TABLE "agency_reports" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "agency_reports" ADD CONSTRAINT "agency_reports_share_token_unique" UNIQUE("share_token");