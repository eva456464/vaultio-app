ALTER TABLE "org_websites" ADD COLUMN "seed_topics" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "quality_checks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "faq" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content_plan_items" ADD COLUMN "planned_title" text;--> statement-breakpoint
ALTER TABLE "content_plan_items" ADD COLUMN "article_type" text;--> statement-breakpoint
ALTER TABLE "content_plan_items" ADD COLUMN "research" jsonb;