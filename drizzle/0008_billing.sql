ALTER TABLE "organizations" ADD COLUMN "billing_exempt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "hosted_invoice_url" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "price_lookup_key" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "paused_at" timestamp with time zone;