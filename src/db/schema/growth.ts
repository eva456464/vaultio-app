// Backlink exchange, site health audits, AI visibility tracking and social agents.
import {
  boolean,
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
import { articles } from "./content";
import { orgWebsites } from "./organization";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---------------------------------------------------------------- Backlinks

export const backlinks = pgTable(
  "backlinks",
  {
    id: serial("id").primaryKey(),
    sourceOrgWebsiteId: integer("source_org_website_id").references(() => orgWebsites.id, {
      onDelete: "set null",
    }),
    // External giver domain when the source site is not on the platform.
    sourceDomain: text("source_domain").notNull(),
    targetOrgWebsiteId: integer("target_org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    url: text("url"),
    targetUrl: text("target_url"),
    anchorText: text("anchor_text"),
    articleId: integer("article_id").references(() => articles.id, { onDelete: "set null" }),
    isBacklinkPresent: boolean("is_backlink_present").notNull().default(false),
    linkPower: integer("link_power"),
    followType: text("follow_type").$type<"dofollow" | "nofollow">().notNull().default("dofollow"),
    explanation: text("explanation"),
    becameOnlineAt: timestamp("became_online_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("backlinks_target_idx").on(t.targetOrgWebsiteId),
    index("backlinks_source_idx").on(t.sourceOrgWebsiteId),
  ],
);

/** Credit movements for the exchange (earn when giving, spend when receiving). */
export const backlinkCreditLedger = pgTable("backlink_credit_ledger", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  backlinkId: integer("backlink_id").references(() => backlinks.id, { onDelete: "set null" }),
  delta: integer("delta").notNull(),
  reason: text("reason").$type<"signup_bonus" | "link_given" | "link_received" | "purchase" | "adjustment" | "article_feedback">().notNull(),
  ...timestamps,
});

// ------------------------------------------------------------- Site health

export type CrawlerFileStatus = { status: "ok" | "missing" | "error"; detail?: string };

export const geoAudits = pgTable("geo_audits", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  status: text("status").$type<"queued" | "running" | "completed" | "failed">().notNull(),
  overallScore: integer("overall_score"),
  averageGeoScore: integer("average_geo_score"),
  averagePageSpeed: integer("average_page_speed"),
  llmOptimizationScore: integer("llm_optimization_score"),
  technicalSeoScore: integer("technical_seo_score"),
  robotsTxt: jsonb("robots_txt").$type<CrawlerFileStatus>(),
  sitemap: jsonb("sitemap").$type<CrawlerFileStatus>(),
  llmsTxt: jsonb("llms_txt").$type<CrawlerFileStatus>(),
  pagesAudited: integer("pages_audited").notNull().default(0),
  shareToken: text("share_token").unique(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
});

export const geoAuditPages = pgTable("geo_audit_pages", {
  id: serial("id").primaryKey(),
  geoAuditId: integer("geo_audit_id")
    .notNull()
    .references(() => geoAudits.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  geoScore: integer("geo_score"),
  pageSpeed: integer("page_speed"),
  ...timestamps,
});

export const geoAuditIssues = pgTable("geo_audit_issues", {
  id: serial("id").primaryKey(),
  geoAuditId: integer("geo_audit_id")
    .notNull()
    .references(() => geoAudits.id, { onDelete: "cascade" }),
  pageId: integer("page_id").references(() => geoAuditPages.id, { onDelete: "cascade" }),
  issueType: text("issue_type").notNull(),
  description: text("description").notNull(),
  action: text("action"),
  severity: text("severity").$type<"low" | "medium" | "high">().notNull(),
  fixedAt: timestamp("fixed_at", { withTimezone: true }),
  ...timestamps,
});

export const geoAuditSelectedPages = pgTable("geo_audit_selected_pages", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  ...timestamps,
});

// ------------------------------------------------------------ AI visibility

export type PromptIntent = "awareness" | "research" | "comparison" | "learning" | "buying" | "other";
export type LlmProvider = "openai" | "anthropic" | "google" | "perplexity";

export const llmPrompts = pgTable(
  "llm_prompts",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    intent: text("intent").$type<PromptIntent>().notNull().default("other"),
    isActive: boolean("is_active").notNull().default(true),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("llm_prompts_site_idx").on(t.orgWebsiteId)],
);

export type LlmSource = { url: string; domain: string; sourceType?: string };
export type LlmBrandMention = { brandName: string; brandUrl?: string; sentiment?: number; isOwnBrand?: boolean };

export const llmAnswers = pgTable(
  "llm_answers",
  {
    id: serial("id").primaryKey(),
    promptId: integer("prompt_id")
      .notNull()
      .references(() => llmPrompts.id, { onDelete: "cascade" }),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    llmProvider: text("llm_provider").$type<LlmProvider>().notNull(),
    llmModel: text("llm_model").notNull(),
    answer: text("answer").notNull(),
    orgWebsiteMentioned: boolean("org_website_mentioned").notNull().default(false),
    sentiment: real("sentiment"),
    sources: jsonb("sources").$type<LlmSource[]>().notNull().default([]),
    brands: jsonb("brands").$type<LlmBrandMention[]>().notNull().default([]),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index("llm_answers_site_idx").on(t.orgWebsiteId, t.checkedAt)],
);

// ------------------------------------------------------- Reddit / Quora agents

export const COMMUNITY_PLATFORMS = ["reddit", "quora"] as const;
export type CommunityPlatform = (typeof COMMUNITY_PLATFORMS)[number];
export type CommunitySource = "google" | "web";

export const communitySettings = pgTable(
  "community_settings",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    platform: text("platform").$type<CommunityPlatform>().notNull(),
    maxKeywords: integer("max_keywords").notNull().default(5),
    autopilotEnabled: boolean("autopilot_enabled").notNull().default(false),
    replyInstructions: text("reply_instructions"),
    dailyScheduleCap: integer("daily_schedule_cap").notNull().default(3),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    subreddits: jsonb("subreddits").$type<string[]>().notNull().default([]),
    // When keyword suggestions were last prepared from the business profile (once per platform).
    keywordsSuggestedAt: timestamp("keywords_suggested_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("community_settings_site_platform_idx").on(t.orgWebsiteId, t.platform)],
);

/** Search phrases monitored per platform. Inactive rows are suggestions shown under "Add more". */
export const communityKeywords = pgTable(
  "community_keywords",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    platform: text("platform").$type<CommunityPlatform>().notNull(),
    keyword: text("keyword").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    searchVolume: integer("search_volume"),
    cpc: real("cpc"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("community_keywords_site_platform_keyword_idx").on(t.orgWebsiteId, t.platform, t.keyword)],
);

export const communityPosts = pgTable(
  "community_posts",
  {
    id: serial("id").primaryKey(),
    platform: text("platform").$type<CommunityPlatform>().notNull(),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    author: text("author"),
    subreddit: text("subreddit"),
    upvotes: integer("upvotes"),
    numComments: integer("num_comments"),
    followers: integer("followers"),
    viewCount: integer("view_count"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("community_posts_platform_external_idx").on(t.platform, t.externalId)],
);

export const communityOpportunities = pgTable(
  "community_opportunities",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    platform: text("platform").$type<CommunityPlatform>().notNull(),
    postId: integer("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    keywordId: integer("keyword_id").references(() => communityKeywords.id, { onDelete: "set null" }),
    opportunityScore: real("opportunity_score"),
    relevanceScore: real("relevance_score"),
    engagementScore: real("engagement_score"),
    recencyScore: real("recency_score"),
    reasoning: text("reasoning"),
    // Where the thread was found: Google results ("google") or Claude web search ("web").
    source: text("source").$type<CommunitySource>(),
    suggestedComment: text("suggested_comment"),
    markedAsRepliedAt: timestamp("marked_as_replied_at", { withTimezone: true }),
    discardedAt: timestamp("discarded_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("community_opps_site_idx").on(t.orgWebsiteId, t.platform),
    uniqueIndex("community_opps_site_post_idx").on(t.orgWebsiteId, t.postId),
  ],
);

// --------------------------------------------------------- Instagram & Facebook

export const metaConnections = pgTable("meta_connections", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  facebookPageId: text("facebook_page_id"),
  facebookPageName: text("facebook_page_name"),
  instagramUserId: text("instagram_user_id"),
  instagramUsername: text("instagram_username"),
  accessTokenEncrypted: text("access_token_encrypted"),
  status: text("status").$type<"active" | "expired" | "error">().notNull().default("active"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  lastErrorMessage: text("last_error_message"),
  ...timestamps,
});

export const metaPosts = pgTable("meta_posts", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  articleId: integer("article_id").references(() => articles.id, { onDelete: "set null" }),
  postType: text("post_type").$type<"educational" | "philosophical" | "myth_busting" | "storytelling">(),
  slides: jsonb("slides").$type<{ imageUrl: string; text: string }[]>().notNull().default([]),
  caption: text("caption"),
  status: text("status").$type<"pending" | "approved" | "published" | "dismissed" | "failed">().notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  facebookPostUrl: text("facebook_post_url"),
  instagramPostUrl: text("instagram_post_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
});
