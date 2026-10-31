CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"article_id" integer,
	"kind" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"prompt" text,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_websites" ADD COLUMN "image_mood" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "deliveries" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_site_idx" ON "media_assets" USING btree ("org_website_id");