ALTER TABLE "article_improvements" ADD COLUMN "opportunity" text;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD COLUMN "scheduled_for" date;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD COLUMN "original_title" text;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD COLUMN "original_meta" text;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD COLUMN "changes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD COLUMN "safety_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD COLUMN "queries" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "article_improvements_site_idx" ON "article_improvements" USING btree ("org_website_id","status");