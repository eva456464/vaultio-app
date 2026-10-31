CREATE TABLE "agent_job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"job" text NOT NULL,
	"run_date" date NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"detail" text,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_job_runs" ADD CONSTRAINT "agent_job_runs_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_job_runs_site_job_date_idx" ON "agent_job_runs" USING btree ("org_website_id","job","run_date");