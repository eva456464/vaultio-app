ALTER TABLE "community_opportunities" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "community_settings" ADD COLUMN "keywords_suggested_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "community_keywords_site_platform_keyword_idx" ON "community_keywords" USING btree ("org_website_id","platform","keyword");--> statement-breakpoint
CREATE UNIQUE INDEX "community_opps_site_post_idx" ON "community_opportunities" USING btree ("org_website_id","post_id");