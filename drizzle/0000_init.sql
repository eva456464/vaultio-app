CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"url" text NOT NULL,
	"organic_traffic" integer,
	"last_analyzed_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_website_access" (
	"member_id" integer NOT NULL,
	"org_website_id" integer NOT NULL,
	CONSTRAINT "member_website_access_member_id_org_website_id_pk" PRIMARY KEY("member_id","org_website_id")
);
--> statement-breakpoint
CREATE TABLE "org_websites" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"url" text NOT NULL,
	"brand_name" text,
	"selected_language" text DEFAULT 'en' NOT NULL,
	"primary_org_website_id" integer,
	"creation_source" text DEFAULT 'web_app' NOT NULL,
	"onboarding_status" text DEFAULT 'not_started' NOT NULL,
	"last_completed_onboarding_step" text,
	"onboarding_completed_at" timestamp with time zone,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"detected_platform" text,
	"logo_url" text,
	"screenshot_url" text,
	"time_zone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"description" text,
	"positioning" text,
	"industry" text,
	"business_type" text,
	"target_audience" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"main_services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"services_offered" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"services_offered_updated_at" timestamp with time zone,
	"brand_description" text,
	"brand_color" text,
	"brand_secondary_color" text,
	"brand_voice" jsonb,
	"profile_confirmed_at" timestamp with time zone,
	"example_article_url" text,
	"promo_website_url" text,
	"sitemap_url" text,
	"research_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"article_instructions" text,
	"article_disclaimer" text,
	"english_type" text DEFAULT 'american' NOT NULL,
	"article_length_target" integer DEFAULT 2000 NOT NULL,
	"author_name" text,
	"include_perspective" boolean DEFAULT true NOT NULL,
	"include_toc" boolean DEFAULT true NOT NULL,
	"include_tldr" boolean DEFAULT true NOT NULL,
	"summary_style" text DEFAULT 'tldr' NOT NULL,
	"include_recommended_reads" boolean DEFAULT true NOT NULL,
	"include_sources_section" boolean DEFAULT true NOT NULL,
	"include_citation" boolean DEFAULT true NOT NULL,
	"mention_competitors_if_relevant" boolean DEFAULT false NOT NULL,
	"include_json_ld" boolean DEFAULT true NOT NULL,
	"include_faq_json_ld" boolean DEFAULT true NOT NULL,
	"include_internal_links" boolean DEFAULT true NOT NULL,
	"include_youtube" boolean DEFAULT false NOT NULL,
	"youtube_channel" text,
	"include_cta_image" boolean DEFAULT true NOT NULL,
	"cta_settings" jsonb,
	"citation_region" text DEFAULT 'worldwide' NOT NULL,
	"use_www_in_links" boolean DEFAULT false NOT NULL,
	"use_trailing_slash_in_links" boolean DEFAULT false NOT NULL,
	"image_instructions" text,
	"hero_image_style" text DEFAULT 'realistic_with_title' NOT NULL,
	"body_image_style" text DEFAULT 'realistic' NOT NULL,
	"infographic_style" text DEFAULT 'editorial' NOT NULL,
	"article_schedule_weekdays" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_publish" boolean DEFAULT true NOT NULL,
	"improvements_enabled" boolean DEFAULT false NOT NULL,
	"improvement_weekdays" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"improvements_auto_publish" boolean DEFAULT false NOT NULL,
	"backlinks_enabled" boolean DEFAULT true NOT NULL,
	"domain_rating" integer,
	"min_backlink_giver_domain_rating" integer,
	"blog_path" text DEFAULT '/blog' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"website_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"token" text NOT NULL,
	"invited_by_id" text,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"all_websites" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"creator_id" text,
	"is_agency" boolean DEFAULT false NOT NULL,
	"acquisition_channel" text,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"url" text NOT NULL,
	"meta_title" text,
	"last_modified_at" timestamp with time zone,
	"is_saved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "target_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"location_code" integer NOT NULL,
	"name" text NOT NULL,
	"country_code" text,
	"kind" text DEFAULT 'country' NOT NULL,
	"parent_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"platform_language" text DEFAULT 'en' NOT NULL,
	"news_subscribed" boolean DEFAULT true NOT NULL,
	"is_invoice_email_enabled" boolean DEFAULT true NOT NULL,
	"referral_code" text,
	"has_watched_welcome_video" boolean DEFAULT false NOT NULL,
	"has_seen_article_hints" boolean DEFAULT false NOT NULL,
	"completed_setup_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_seen_product_update_at" timestamp with time zone,
	"deletion_requested_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whitelabel_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"domain" text,
	"brand_name" text NOT NULL,
	"primary_color" text DEFAULT '#E94545' NOT NULL,
	"secondary_color" text DEFAULT '#000000' NOT NULL,
	"logo_url" text,
	"favicon_url" text,
	"sending_domain" text,
	"default_language" text DEFAULT 'en' NOT NULL,
	"domain_verified" boolean DEFAULT false NOT NULL,
	"recommended_cname" text,
	"email_domain_id" text,
	"email_domain_status" text,
	"email_domain_records" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whitelabel_configs_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "whitelabel_configs_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "article_improvements" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"page_url" text NOT NULL,
	"article_id" integer,
	"status" text NOT NULL,
	"reason" text,
	"original_content" text,
	"improved_content" text,
	"gsc_snapshot" jsonb,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"keyword_cluster_id" integer,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"meta_description" text,
	"language_code" text DEFAULT 'en' NOT NULL,
	"article_type" text,
	"content" text,
	"html_content" text,
	"outline" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero_image_url" text,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"json_ld" jsonb,
	"faq_json_ld" jsonb,
	"seo_score" integer,
	"word_count" integer,
	"internal_links_count" integer DEFAULT 0 NOT NULL,
	"external_links_count" integer DEFAULT 0 NOT NULL,
	"backlinks_count" integer DEFAULT 0 NOT NULL,
	"generation_rationale" jsonb,
	"generation_settings" jsonb,
	"published_url" text,
	"published_at" timestamp with time zone,
	"last_url_check_at" timestamp with time zone,
	"is_happy_feedback" boolean,
	"feedback_comment" text,
	"ai_image_regeneration_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"scheduled_for" date NOT NULL,
	"keyword_cluster_id" integer,
	"article_id" integer,
	"generation_status" text DEFAULT 'queued' NOT NULL,
	"user_instruction" text,
	"support_url" text,
	"proposed_product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_local_keyword" boolean DEFAULT false NOT NULL,
	"keyword_location" text,
	"why_this_topic" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_clusters" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"seed_keyword_id" integer NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_search_volume" integer,
	"average_intent" text,
	"creation_source" text DEFAULT 'onboarding' NOT NULL,
	"location_name" text,
	"common_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" real,
	"article_generation_attempts" integer DEFAULT 0 NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"description" text,
	"url" text,
	"image_url" text,
	"price" text,
	"currency" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seed_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"language_code" text DEFAULT 'en' NOT NULL,
	"avg_search_volume" integer,
	"keyword_difficulty" integer,
	"average_cpc" real,
	"average_intent" text,
	"article_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backlink_credit_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"backlink_id" integer,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backlinks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_org_website_id" integer,
	"source_domain" text NOT NULL,
	"target_org_website_id" integer NOT NULL,
	"url" text,
	"target_url" text,
	"anchor_text" text,
	"article_id" integer,
	"is_backlink_present" boolean DEFAULT false NOT NULL,
	"link_power" integer,
	"follow_type" text DEFAULT 'dofollow' NOT NULL,
	"explanation" text,
	"became_online_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"last_crawled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"platform" text NOT NULL,
	"keyword" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"search_volume" integer,
	"cpc" real,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"platform" text NOT NULL,
	"post_id" integer NOT NULL,
	"keyword_id" integer,
	"opportunity_score" real,
	"relevance_score" real,
	"engagement_score" real,
	"recency_score" real,
	"reasoning" text,
	"suggested_comment" text,
	"marked_as_replied_at" timestamp with time zone,
	"discarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"author" text,
	"subreddit" text,
	"upvotes" integer,
	"num_comments" integer,
	"followers" integer,
	"view_count" integer,
	"posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"platform" text NOT NULL,
	"max_keywords" integer DEFAULT 5 NOT NULL,
	"autopilot_enabled" boolean DEFAULT false NOT NULL,
	"reply_instructions" text,
	"daily_schedule_cap" integer DEFAULT 3 NOT NULL,
	"next_run_at" timestamp with time zone,
	"subreddits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_audit_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"geo_audit_id" integer NOT NULL,
	"page_id" integer,
	"issue_type" text NOT NULL,
	"description" text NOT NULL,
	"action" text,
	"severity" text NOT NULL,
	"fixed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_audit_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"geo_audit_id" integer NOT NULL,
	"url" text NOT NULL,
	"geo_score" integer,
	"page_speed" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_audit_selected_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"status" text NOT NULL,
	"overall_score" integer,
	"average_geo_score" integer,
	"average_page_speed" integer,
	"llm_optimization_score" integer,
	"technical_seo_score" integer,
	"robots_txt" jsonb,
	"sitemap" jsonb,
	"llms_txt" jsonb,
	"pages_audited" integer DEFAULT 0 NOT NULL,
	"share_token" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "geo_audits_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "llm_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt_id" integer NOT NULL,
	"org_website_id" integer NOT NULL,
	"llm_provider" text NOT NULL,
	"llm_model" text NOT NULL,
	"answer" text NOT NULL,
	"org_website_mentioned" boolean DEFAULT false NOT NULL,
	"sentiment" real,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brands" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"intent" text DEFAULT 'other' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"facebook_page_id" text,
	"facebook_page_name" text,
	"instagram_user_id" text,
	"instagram_username" text,
	"access_token_encrypted" text,
	"status" text DEFAULT 'active' NOT NULL,
	"token_expires_at" timestamp with time zone,
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"article_id" integer,
	"post_type" text,
	"slides" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"caption" text,
	"status" text NOT NULL,
	"scheduled_for" timestamp with time zone,
	"facebook_post_url" text,
	"instagram_post_url" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_reporting_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"auto_send" boolean DEFAULT false NOT NULL,
	"recipient_email" text,
	"kpi_metrics" jsonb DEFAULT '["clicks","impressions","position"]'::jsonb NOT NULL,
	"block_toggles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_reporting_settings_org_website_id_unique" UNIQUE("org_website_id")
);
--> statement-breakpoint
CREATE TABLE "agency_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"pdf_url" text,
	"sent_to" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"day" date,
	"count" integer,
	"total" integer,
	"title" text,
	"article_id" integer,
	"published_url" text,
	"source_url" text,
	"domain_rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"source" text DEFAULT 'api' NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "async_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"progress" integer,
	"result" jsonb,
	"error" text,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ga4_ai_source_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"date" date NOT NULL,
	"source" text NOT NULL,
	"landing_page" text,
	"active_users" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ga4_channel_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"date" date NOT NULL,
	"channel" text NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsc_daily_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"date" date NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" real,
	"position" real
);
--> statement-breakpoint
CREATE TABLE "gsc_dimension_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"dimension" text NOT NULL,
	"key" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" real,
	"position" real
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"credentials_encrypted" text,
	"last_error" text,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"org_website_id" integer,
	"subscription_type" text,
	"stripe_invoice_id" text,
	"number" text,
	"amount_due" bigint NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text NOT NULL,
	"invoice_pdf_url" text,
	"issued_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"category" text NOT NULL,
	"threshold" real NOT NULL,
	"value" real NOT NULL,
	"gain_last_7_days" real,
	"next_threshold" real,
	"achieved_at" timestamp with time zone NOT NULL,
	"seen_at" timestamp with time zone,
	"proof" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link_url" text,
	"launched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"org_website_id" integer,
	"type" text NOT NULL,
	"plan" text,
	"interval" text DEFAULT 'month' NOT NULL,
	"status" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_amount" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"trial_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "website_metrics_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_website_id" integer NOT NULL,
	"date" date NOT NULL,
	"domain_rating" integer,
	"referring_domains" integer,
	"organic_traffic" integer
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_website_access" ADD CONSTRAINT "member_website_access_member_id_organization_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."organization_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_website_access" ADD CONSTRAINT "member_website_access_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_websites" ADD CONSTRAINT "org_websites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_id_user_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_locations" ADD CONSTRAINT "target_locations_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whitelabel_configs" ADD CONSTRAINT "whitelabel_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD CONSTRAINT "article_improvements_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_improvements" ADD CONSTRAINT "article_improvements_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_keyword_cluster_id_keyword_clusters_id_fk" FOREIGN KEY ("keyword_cluster_id") REFERENCES "public"."keyword_clusters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_plan_items" ADD CONSTRAINT "content_plan_items_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_plan_items" ADD CONSTRAINT "content_plan_items_keyword_cluster_id_keyword_clusters_id_fk" FOREIGN KEY ("keyword_cluster_id") REFERENCES "public"."keyword_clusters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_clusters" ADD CONSTRAINT "keyword_clusters_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_clusters" ADD CONSTRAINT "keyword_clusters_seed_keyword_id_seed_keywords_id_fk" FOREIGN KEY ("seed_keyword_id") REFERENCES "public"."seed_keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlink_credit_ledger" ADD CONSTRAINT "backlink_credit_ledger_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlink_credit_ledger" ADD CONSTRAINT "backlink_credit_ledger_backlink_id_backlinks_id_fk" FOREIGN KEY ("backlink_id") REFERENCES "public"."backlinks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlinks" ADD CONSTRAINT "backlinks_source_org_website_id_org_websites_id_fk" FOREIGN KEY ("source_org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlinks" ADD CONSTRAINT "backlinks_target_org_website_id_org_websites_id_fk" FOREIGN KEY ("target_org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlinks" ADD CONSTRAINT "backlinks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_keywords" ADD CONSTRAINT "community_keywords_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_opportunities" ADD CONSTRAINT "community_opportunities_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_opportunities" ADD CONSTRAINT "community_opportunities_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_opportunities" ADD CONSTRAINT "community_opportunities_keyword_id_community_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."community_keywords"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_settings" ADD CONSTRAINT "community_settings_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_audit_issues" ADD CONSTRAINT "geo_audit_issues_geo_audit_id_geo_audits_id_fk" FOREIGN KEY ("geo_audit_id") REFERENCES "public"."geo_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_audit_issues" ADD CONSTRAINT "geo_audit_issues_page_id_geo_audit_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."geo_audit_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_audit_pages" ADD CONSTRAINT "geo_audit_pages_geo_audit_id_geo_audits_id_fk" FOREIGN KEY ("geo_audit_id") REFERENCES "public"."geo_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_audit_selected_pages" ADD CONSTRAINT "geo_audit_selected_pages_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_audits" ADD CONSTRAINT "geo_audits_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_answers" ADD CONSTRAINT "llm_answers_prompt_id_llm_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."llm_prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_answers" ADD CONSTRAINT "llm_answers_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_prompts" ADD CONSTRAINT "llm_prompts_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_connections" ADD CONSTRAINT "meta_connections_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_posts" ADD CONSTRAINT "meta_posts_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_posts" ADD CONSTRAINT "meta_posts_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_reporting_settings" ADD CONSTRAINT "agency_reporting_settings_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_reports" ADD CONSTRAINT "agency_reports_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_activities" ADD CONSTRAINT "agent_activities_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "async_jobs" ADD CONSTRAINT "async_jobs_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ga4_ai_source_daily" ADD CONSTRAINT "ga4_ai_source_daily_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ga4_channel_daily" ADD CONSTRAINT "ga4_channel_daily_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_daily_metrics" ADD CONSTRAINT "gsc_daily_metrics_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_dimension_metrics" ADD CONSTRAINT "gsc_dimension_metrics_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_metrics_history" ADD CONSTRAINT "website_metrics_history_org_website_id_org_websites_id_fk" FOREIGN KEY ("org_website_id") REFERENCES "public"."org_websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "competitors_site_idx" ON "competitors" USING btree ("org_website_id");--> statement-breakpoint
CREATE INDEX "org_websites_org_idx" ON "org_websites" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_user_idx" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "site_pages_site_url_idx" ON "site_pages" USING btree ("org_website_id","url");--> statement-breakpoint
CREATE INDEX "articles_site_idx" ON "articles" USING btree ("org_website_id");--> statement-breakpoint
CREATE INDEX "content_plan_site_date_idx" ON "content_plan_items" USING btree ("org_website_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "keyword_clusters_site_idx" ON "keyword_clusters" USING btree ("org_website_id");--> statement-breakpoint
CREATE INDEX "backlinks_target_idx" ON "backlinks" USING btree ("target_org_website_id");--> statement-breakpoint
CREATE INDEX "backlinks_source_idx" ON "backlinks" USING btree ("source_org_website_id");--> statement-breakpoint
CREATE INDEX "community_opps_site_idx" ON "community_opportunities" USING btree ("org_website_id","platform");--> statement-breakpoint
CREATE UNIQUE INDEX "community_posts_platform_external_idx" ON "community_posts" USING btree ("platform","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_settings_site_platform_idx" ON "community_settings" USING btree ("org_website_id","platform");--> statement-breakpoint
CREATE INDEX "llm_answers_site_idx" ON "llm_answers" USING btree ("org_website_id","checked_at");--> statement-breakpoint
CREATE INDEX "llm_prompts_site_idx" ON "llm_prompts" USING btree ("org_website_id");--> statement-breakpoint
CREATE INDEX "agent_activities_site_time_idx" ON "agent_activities" USING btree ("org_website_id","occurred_at");--> statement-breakpoint
CREATE INDEX "ga4_ai_source_site_date_idx" ON "ga4_ai_source_daily" USING btree ("org_website_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "ga4_channel_site_date_idx" ON "ga4_channel_daily" USING btree ("org_website_id","date","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "gsc_daily_site_date_idx" ON "gsc_daily_metrics" USING btree ("org_website_id","date");--> statement-breakpoint
CREATE INDEX "gsc_dimension_site_idx" ON "gsc_dimension_metrics" USING btree ("org_website_id","dimension");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_site_type_idx" ON "integrations" USING btree ("org_website_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "milestones_site_category_threshold_idx" ON "milestones" USING btree ("org_website_id","category","threshold");--> statement-breakpoint
CREATE INDEX "subscriptions_site_idx" ON "subscriptions" USING btree ("org_website_id");