CREATE TABLE "brand_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"kind" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whitelabel_configs" ADD COLUMN "domain_records" jsonb;--> statement-breakpoint
ALTER TABLE "whitelabel_configs" ADD COLUMN "domain_error" text;--> statement-breakpoint
ALTER TABLE "whitelabel_configs" ADD COLUMN "domain_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whitelabel_configs" ADD COLUMN "email_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;