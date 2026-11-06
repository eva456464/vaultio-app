CREATE TABLE "email_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_website_id" integer NOT NULL,
	"weekly_progress" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_preferences_user_site_idx" ON "email_preferences" USING btree ("user_id","org_website_id");