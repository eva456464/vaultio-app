ALTER TABLE "articles" ADD COLUMN "featured_products" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content_plan_items" ADD COLUMN "products_customized" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "content_plan_items" ADD COLUMN "products_matched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variants" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "include_in_articles" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "synced_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "products_site_idx" ON "products" USING btree ("org_website_id","source");--> statement-breakpoint
CREATE UNIQUE INDEX "products_site_external_idx" ON "products" USING btree ("org_website_id","source","external_id");