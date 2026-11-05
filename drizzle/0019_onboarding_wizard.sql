ALTER TABLE "org_websites" ADD COLUMN "onboarding_answers" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "acquisition_detail" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "agency_setup_step" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "agency_mode" text;