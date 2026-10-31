ALTER TABLE "article_improvements" ADD COLUMN "source" text DEFAULT 'vaultio' NOT NULL;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD COLUMN "wordpress" jsonb;