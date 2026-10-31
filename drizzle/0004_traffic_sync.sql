CREATE TABLE "ga4_range_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"range" text NOT NULL,
	"kind" text NOT NULL,
	"key" text DEFAULT '' NOT NULL,
	"sub_key" text DEFAULT '' NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL,
	"top_source" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ga4_range_metrics" ADD CONSTRAINT "ga4_range_metrics_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ga4_range_site_idx" ON "ga4_range_metrics" USING btree ("org_website_id","range","kind");--> statement-breakpoint
CREATE INDEX "gsc_dimension_site_day_idx" ON "gsc_dimension_metrics" USING btree ("org_website_id","dimension","period_start");