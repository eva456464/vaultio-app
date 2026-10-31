// Agent activity feed, achievements, analytics snapshots, billing mirror, integrations,
// agency reporting and background job tracking.
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { TrafficRange } from "../../lib/traffic";
import { organizations, orgWebsites } from "./organization";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ------------------------------------------------------------ Agent activity

export const ACTIVITY_TYPES = [
  "articlePublished",
  "articleWritten",
  "topicResearched",
  "topicsPlanned",
  "cannibalizationCheck",
  "backlinkReceived",
  "backlinkExchangeEnrolled",
  "socialPostPublished",
  "siteHealthAudit",
  "aiVisibilityCheck",
  "analyticsSync",
  "aiTrafficReport",
  "rankingsCheck",
  "domainRatingCheck",
  "sitemapSync",
  "competitorGapScan",
  "websiteAnalyzed",
  "competitorsFound",
  "keywordResearch",
  "promptsGenerated",
  "firstMonthPlanned",
  "reportSent",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Every action an agent performed. The Overview feed is built from this log. */
export const agentActivities = pgTable(
  "agent_activities",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    type: text("type").$type<ActivityType>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    // Day-level activities (syncs, checks) are attributed to a calendar day.
    day: date("day"),
    count: integer("count"),
    total: integer("total"),
    title: text("title"),
    articleId: integer("article_id"),
    publishedUrl: text("published_url"),
    sourceUrl: text("source_url"),
    domainRating: integer("domain_rating"),
    ...timestamps,
  },
  (t) => [index("agent_activities_site_time_idx").on(t.orgWebsiteId, t.occurredAt)],
);

export const MILESTONE_CATEGORIES = [
  "backlinks",
  "backlinks_value",
  "ad_spend_saved",
  "total_clicks",
  "total_impressions",
  "ai_referral_first",
  "ai_visitors_chatgpt",
  "ai_visitors_perplexity",
  "ai_visitors_gemini",
  "ai_mentions",
  "ai_mention_chatgpt",
  "ai_mention_claude",
  "ai_citations",
  "ai_cited_own_article",
  "dr_badge",
  "dr_gain",
  "articles_indexed",
  "article_clicks",
  "article_impressions",
  "keywords_top3",
  "keywords_top10",
  "keywords_top20",
  "keywords_top30",
] as const;
export type MilestoneCategory = (typeof MILESTONE_CATEGORIES)[number];

export type MilestoneProof =
  | { kind: "backlinks"; items: { url: string; domainRating: number; date: string; value?: number }[] }
  | { kind: "search_traffic"; metric: "clicks" | "impressions"; series?: { date: string; value: number }[] }
  | { kind: "ai_visits"; provider?: string; total: number }
  | { kind: "ai_mentions"; items: { prompt: string; provider: string; date: string }[] }
  | { kind: "domain_rating"; rating: number; startRating?: number; reachedOn: string }
  | { kind: "indexed_articles"; items: { title: string; url: string }[] }
  | { kind: "keywords"; band: string; items: { query: string; position: number; url?: string }[] }
  | { kind: "generic"; text?: string };

/** One achievement ladder per category and site; a row per threshold reached. */
export const milestones = pgTable(
  "milestones",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    category: text("category").$type<MilestoneCategory>().notNull(),
    threshold: real("threshold").notNull(),
    value: real("value").notNull(),
    gainLast7Days: real("gain_last_7_days"),
    nextThreshold: real("next_threshold"),
    achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    proof: jsonb("proof").$type<MilestoneProof>(),
    ...timestamps,
  },
  (t) => [uniqueIndex("milestones_site_category_threshold_idx").on(t.orgWebsiteId, t.category, t.threshold)],
);

export const productUpdates = pgTable("product_updates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  linkUrl: text("link_url"),
  launchedAt: timestamp("launched_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

/** Long-running background tasks the UI can poll (audits, regenerations, imports). */
export const asyncJobs = pgTable("async_jobs", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id").references(() => orgWebsites.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: text("status").$type<"queued" | "running" | "completed" | "failed">().notNull(),
  progress: integer("progress"),
  result: jsonb("result"),
  error: text("error"),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  ...timestamps,
});

// ---------------------------------------------------------------- Analytics

export const gscDailyMetrics = pgTable(
  "gsc_daily_metrics",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: real("ctr"),
    position: real("position"),
  },
  (t) => [uniqueIndex("gsc_daily_site_date_idx").on(t.orgWebsiteId, t.date)],
);

/** Aggregated Search Console rows by dimension (query, page or country) per sync. */
export const gscDimensionMetrics = pgTable(
  "gsc_dimension_metrics",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    dimension: text("dimension").$type<"query" | "page" | "country">().notNull(),
    key: text("key").notNull(),
    // The sync stores one row per day (start = end); ranges are summed from these.
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: real("ctr"),
    position: real("position"),
  },
  (t) => [
    index("gsc_dimension_site_idx").on(t.orgWebsiteId, t.dimension),
    index("gsc_dimension_site_day_idx").on(t.orgWebsiteId, t.dimension, t.periodStart),
  ],
);

export const GA4_CHANNELS = ["Direct", "Other", "Organic search", "LLM referrers", "Paid"] as const;
export type Ga4Channel = (typeof GA4_CHANNELS)[number];

export const ga4ChannelDaily = pgTable(
  "ga4_channel_daily",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    channel: text("channel").$type<Ga4Channel>().notNull(),
    activeUsers: integer("active_users").notNull().default(0),
    sessions: integer("sessions").notNull().default(0),
  },
  (t) => [uniqueIndex("ga4_channel_site_date_idx").on(t.orgWebsiteId, t.date, t.channel)],
);

export const ga4AiSourceDaily = pgTable(
  "ga4_ai_source_daily",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    source: text("source").notNull(),
    landingPage: text("landing_page"),
    activeUsers: integer("active_users").notNull().default(0),
  },
  (t) => [index("ga4_ai_source_site_date_idx").on(t.orgWebsiteId, t.date)],
);

export const GA4_RANGE_KINDS = ["total", "channel", "page", "aiTotal", "aiSource", "aiPage"] as const;
export type Ga4RangeKind = (typeof GA4_RANGE_KINDS)[number];

/**
 * GA4 numbers for each period the Site traffic pages offer. Unique users can't be added up
 * across days, so the analytics agents fetch every period from GA4 as a whole and replace these rows.
 * `key` is the channel, page path or AI model; `subKey` is the page for `aiPage` rows.
 */
export const ga4RangeMetrics = pgTable(
  "ga4_range_metrics",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    range: text("range").$type<TrafficRange>().notNull(),
    kind: text("kind").$type<Ga4RangeKind>().notNull(),
    key: text("key").notNull().default(""),
    subKey: text("sub_key").notNull().default(""),
    activeUsers: integer("active_users").notNull().default(0),
    sessions: integer("sessions").notNull().default(0),
    topSource: text("top_source"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ga4_range_site_idx").on(t.orgWebsiteId, t.range, t.kind)],
);

export const websiteMetricsHistory = pgTable("website_metrics_history", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  domainRating: integer("domain_rating"),
  referringDomains: integer("referring_domains"),
  organicTraffic: integer("organic_traffic"),
});

// ------------------------------------------------------------------ Billing

export const SUBSCRIPTION_TYPES = [
  "main",
  "llm_visibility_prompts",
  "reddit",
  "reddit_autopilot",
  "quora",
  "backlink_credits",
  "meta_autopilot",
  "language_addition",
] as const;
export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[number];

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "incomplete"
  | "unpaid";

/** Local mirror of Stripe subscriptions, kept in sync by webhooks. */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    orgWebsiteId: integer("org_website_id").references(() => orgWebsites.id, { onDelete: "set null" }),
    type: text("type").$type<SubscriptionType>().notNull(),
    plan: text("plan").$type<"grow" | "scale" | null>(),
    interval: text("interval").$type<"month" | "year">().notNull().default("month"),
    status: text("status").$type<SubscriptionStatus>().notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    quantity: integer("quantity").notNull().default(1),
    unitAmount: integer("unit_amount"),
    currency: text("currency").notNull().default("usd"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("subscriptions_site_idx").on(t.orgWebsiteId)],
);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  orgWebsiteId: integer("org_website_id").references(() => orgWebsites.id, { onDelete: "set null" }),
  subscriptionType: text("subscription_type").$type<SubscriptionType>(),
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  number: text("number"),
  amountDue: bigint("amount_due", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").$type<"draft" | "open" | "paid" | "void" | "uncollectible">().notNull(),
  invoicePdfUrl: text("invoice_pdf_url"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

// ------------------------------------------------------------- Integrations

export const INTEGRATION_TYPES = [
  "nextjs",
  "wordpress",
  "wordpress_com",
  "shopify",
  "webflow",
  "wix",
  "ghost",
  "framer",
  "lovable",
  "gohighlevel",
  "duda",
  "bigcommerce",
  "snapps",
  "hosted_blog",
  "webhook",
  "api",
  "gsc",
  "ga4",
] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const integrations = pgTable(
  "integrations",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    type: text("type").$type<IntegrationType>().notNull(),
    status: text("status").$type<"pending" | "connected" | "error" | "disconnected">().notNull(),
    // Non-secret settings (site URL, collection id, selected property...).
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    // Secrets are encrypted at rest with APP_ENCRYPTION_KEY.
    credentialsEncrypted: text("credentials_encrypted"),
    lastError: text("last_error"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("integrations_site_type_idx").on(t.orgWebsiteId, t.type)],
);

/** Keys for the public content API and the Next.js blog package (stored hashed). */
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  source: text("source").notNull().default("api"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
});

// --------------------------------------------------------- Agency reporting

export { REPORT_BLOCKS, type ReportBlock } from "../../lib/report-blocks";
import type { ReportBlock } from "../../lib/report-blocks";

export const agencyReportingSettings = pgTable("agency_reporting_settings", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .unique()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  autoSend: boolean("auto_send").notNull().default(false),
  recipientEmail: text("recipient_email"),
  kpiMetrics: jsonb("kpi_metrics").$type<("clicks" | "impressions" | "position")[]>().notNull().default(["clicks", "impressions", "position"]),
  blockToggles: jsonb("block_toggles").$type<Partial<Record<ReportBlock, boolean>>>().notNull().default({}),
  ...timestamps,
});

export const agencyReports = pgTable("agency_reports", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  // Snapshot of the report as sent, viewable through the share token.
  html: text("html"),
  shareToken: text("share_token").unique(),
  pdfUrl: text("pdf_url"),
  sentTo: text("sent_to"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  ...timestamps,
});

// ----------------------------------------------------------- Agent job runs

export type AgentJobStatus = "queued" | "running" | "completed" | "skipped" | "failed";

/** One row per agent job per site per day; guarantees each scheduled job runs once. */
export const agentJobRuns = pgTable(
  "agent_job_runs",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    job: text("job").notNull(),
    runDate: date("run_date").notNull(),
    status: text("status").$type<AgentJobStatus>().notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    // Why a job was skipped (e.g. "Google Analytics not connected") or the error message.
    detail: text("detail"),
    result: jsonb("result"),
    ...timestamps,
  },
  (t) => [uniqueIndex("agent_job_runs_site_job_date_idx").on(t.orgWebsiteId, t.job, t.runDate)],
);
