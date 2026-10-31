// Keyword research, the content plan (calendar), generated articles and improvements.
import {
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
} from "drizzle-orm/pg-core";
import { orgWebsites } from "./organization";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export type ArticleType =
  | "guide_explainer"
  | "guide_how_to"
  | "listicle_educational"
  | "listicle_comparison"
  | "comparison"
  | "case_study"
  | "opinion";

export const seedKeywords = pgTable("seed_keywords", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
  languageCode: text("language_code").notNull().default("en"),
  avgSearchVolume: integer("avg_search_volume"),
  keywordDifficulty: integer("keyword_difficulty"),
  averageCpc: real("average_cpc"),
  averageIntent: text("average_intent"),
  articleType: text("article_type").$type<ArticleType>(),
  ...timestamps,
});

export const keywordClusters = pgTable(
  "keyword_clusters",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    seedKeywordId: integer("seed_keyword_id")
      .notNull()
      .references(() => seedKeywords.id, { onDelete: "cascade" }),
    keywords: jsonb("keywords").$type<{ keyword: string; searchVolume?: number }[]>().notNull().default([]),
    totalSearchVolume: integer("total_search_volume"),
    averageIntent: text("average_intent"),
    creationSource: text("creation_source").notNull().default("onboarding"),
    locationName: text("location_name"),
    commonUrls: jsonb("common_urls").$type<string[]>().notNull().default([]),
    score: real("score"),
    articleGenerationAttempts: integer("article_generation_attempts").notNull().default(0),
    isUsed: boolean("is_used").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("keyword_clusters_site_idx").on(t.orgWebsiteId)],
);

export type GenerationStatus = "queued" | "researching" | "generating" | "generated" | "published" | "failed";

export const contentPlanItems = pgTable(
  "content_plan_items",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    scheduledFor: date("scheduled_for").notNull(),
    keywordClusterId: integer("keyword_cluster_id").references(() => keywordClusters.id, {
      onDelete: "set null",
    }),
    articleId: integer("article_id"),
    generationStatus: text("generation_status").$type<GenerationStatus>().notNull().default("queued"),
    userInstruction: text("user_instruction"),
    supportUrl: text("support_url"),
    proposedProductIds: jsonb("proposed_product_ids").$type<number[]>().notNull().default([]),
    selectedProductIds: jsonb("selected_product_ids").$type<number[]>().notNull().default([]),
    isLocalKeyword: boolean("is_local_keyword").notNull().default(false),
    keywordLocation: text("keyword_location"),
    whyThisTopic: jsonb("why_this_topic").$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [index("content_plan_site_date_idx").on(t.orgWebsiteId, t.scheduledFor)],
);

export type ArticleMedia = {
  url: string;
  type: "image" | "infographic" | "video";
  source: string;
  altText?: string;
  identifier?: string;
  selected?: boolean;
  thumbnailUrl?: string;
};

export type GenerationRationale = {
  whyThisTopic?: string[];
  whyThisStructure?: string[];
  characteristics?: string[];
};

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    keywordClusterId: integer("keyword_cluster_id").references(() => keywordClusters.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    metaDescription: text("meta_description"),
    languageCode: text("language_code").notNull().default("en"),
    articleType: text("article_type").$type<ArticleType>(),
    content: text("content"),
    htmlContent: text("html_content"),
    outline: jsonb("outline").$type<string[]>().notNull().default([]),
    heroImageUrl: text("hero_image_url"),
    media: jsonb("media").$type<ArticleMedia[]>().notNull().default([]),
    jsonLd: jsonb("json_ld"),
    faqJsonLd: jsonb("faq_json_ld"),
    seoScore: integer("seo_score"),
    wordCount: integer("word_count"),
    internalLinksCount: integer("internal_links_count").notNull().default(0),
    externalLinksCount: integer("external_links_count").notNull().default(0),
    backlinksCount: integer("backlinks_count").notNull().default(0),
    generationRationale: jsonb("generation_rationale").$type<GenerationRationale>(),
    generationSettings: jsonb("generation_settings"),
    publishedUrl: text("published_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastUrlCheckAt: timestamp("last_url_check_at", { withTimezone: true }),
    isHappyFeedback: boolean("is_happy_feedback"),
    feedbackComment: text("feedback_comment"),
    aiImageRegenerationCount: integer("ai_image_regeneration_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("articles_site_idx").on(t.orgWebsiteId)],
);

export const articleImprovements = pgTable("article_improvements", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  pageUrl: text("page_url").notNull(),
  articleId: integer("article_id").references(() => articles.id, { onDelete: "set null" }),
  status: text("status").$type<"candidate" | "pending" | "ready" | "published" | "dismissed">().notNull(),
  reason: text("reason"),
  originalContent: text("original_content"),
  improvedContent: text("improved_content"),
  gscSnapshot: jsonb("gsc_snapshot"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  source: text("source").$type<"manual" | "feed" | "shopify" | "woocommerce">().notNull(),
  externalId: text("external_id"),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url"),
  imageUrl: text("image_url"),
  price: text("price"),
  currency: text("currency"),
  ...timestamps,
});
