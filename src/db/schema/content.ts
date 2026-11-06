// Keyword research, the content plan (calendar), generated articles and improvements.
import {
  boolean,
  customType,
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

export type TopicResearch = {
  serp?: { url: string; title: string; position: number }[];
  cannibalizationCheckedAt?: string;
  replacedKeyword?: string;
};

export type GenerationStatus = "queued" | "researching" | "generating" | "generated" | "published" | "failed";
export type RegenerationRequest = { articleId: number; instructions: string | null; reason: "content" | "topic"; requestedAt: string };

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
    /** Set from the article page ("Regenerate", or a new topic picked in the feedback flow); the regenerateArticle job rewrites the article in place. */
    regenerationRequest: jsonb("regeneration_request").$type<RegenerationRequest>(),
    /** Products the agent matched to this topic, and the ones chosen by hand (used when productsCustomized). */
    proposedProductIds: jsonb("proposed_product_ids").$type<number[]>().notNull().default([]),
    selectedProductIds: jsonb("selected_product_ids").$type<number[]>().notNull().default([]),
    productsCustomized: boolean("products_customized").notNull().default(false),
    productsMatchedAt: timestamp("products_matched_at", { withTimezone: true }),
    isLocalKeyword: boolean("is_local_keyword").notNull().default(false),
    keywordLocation: text("keyword_location"),
    whyThisTopic: jsonb("why_this_topic").$type<string[]>().notNull().default([]),
    plannedTitle: text("planned_title"),
    articleType: text("article_type").$type<ArticleType>(),
    research: jsonb("research").$type<TopicResearch>(),
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
  /** What the image shows (from the writer's image plan); reused when the image is regenerated. */
  scene?: string;
};

/** CTA and video blocks placed in an article; the HTML renderer turns their markers into cards. */
export type ArticleBlock =
  | { kind: "link"; title: string; pitch: string; buttonLabel: string; buttonUrl: string }
  | { kind: "contact"; title: string; pitch: string; phone?: string; whatsapp?: string; email?: string }
  | { kind: "map"; title: string; address: string; mapsUrl: string }
  | { kind: "video"; title: string; videoId: string }
  | { kind: "product"; productId: number; name: string; url: string; imageUrl: string | null; priceLabel: string | null; pitch: string; buttonLabel: string };

/** Where an article was delivered, so later updates change the same post instead of creating another. */
/** Where an article was sent on each platform, so republishing updates the same post. */
export type ArticleDeliveries = {
  wordpress?: { postId: number; featuredMediaId?: number; uploads: Record<string, { id: number; url: string }> };
  ghost?: { postId: string };
  webflow?: { itemId: string };
  shopify?: { articleId: string };
  bigcommerce?: { postId: number; thumbnailPath: string | null };
  gohighlevel?: { postId: string; slug: string; publishedAt?: string };
  wix?: { postId: string };
  wordpress_com?: { postId: number; featuredId?: number; uploads: Record<string, { id: number; url: string }> };
};

export type QualityCheck = { key: string; passed: boolean; detail?: string };

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
    qualityChecks: jsonb("quality_checks").$type<QualityCheck[]>().notNull().default([]),
    sources: jsonb("sources").$type<{ url: string; title: string }[]>().notNull().default([]),
    faq: jsonb("faq").$type<{ question: string; answer: string }[]>().notNull().default([]),
    publishedUrl: text("published_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Published only as drafts on the website's platforms (nothing pulls the articles). */
    publishedAsDraft: boolean("published_as_draft").notNull().default(false),
    lastUrlCheckAt: timestamp("last_url_check_at", { withTimezone: true }),
    isHappyFeedback: boolean("is_happy_feedback"),
    feedbackComment: text("feedback_comment"),
    aiImageRegenerationCount: integer("ai_image_regeneration_count").notNull().default(0),
    blocks: jsonb("blocks").$type<ArticleBlock[]>().notNull().default([]),
    featuredProducts: jsonb("featured_products").$type<FeaturedProduct[]>().notNull().default([]),
    deliveries: jsonb("deliveries").$type<ArticleDeliveries>().notNull().default({}),
    ...timestamps,
  },
  (t) => [index("articles_site_idx").on(t.orgWebsiteId)],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * Images Vaultio generated or received, served publicly at /media/<id>.<ext> (ids are random,
 * so they can't be guessed). Stored in Postgres so there is no separate file storage to run.
 */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    articleId: integer("article_id").references(() => articles.id, { onDelete: "set null" }),
    kind: text("kind").$type<"hero" | "body" | "upload" | "infographic" | "product">().notNull(),
    mimeType: text("mime_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes").notNull(),
    data: bytea("data").notNull(),
    prompt: text("prompt"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_assets_site_idx").on(t.orgWebsiteId)],
);

export const IMPROVEMENT_STATUSES = ["candidate", "scheduled", "generating", "pending_review", "published", "rejected", "failed", "no_changes", "dismissed"] as const;
export type ImprovementStatus = (typeof IMPROVEMENT_STATUSES)[number];
export const OPPORTUNITIES = ["DECLINING", "LOW_CTR", "ALMOST_PAGE_ONE", "THIN_CONTENT", "STALE_CONTENT"] as const;
export type Opportunity = (typeof OPPORTUNITIES)[number];

/** Search Console numbers behind an opportunity (last 90 days unless noted). */
export type ImprovementEvidence = {
  clicks28: number;
  previousClicks28: number;
  impressions90: number;
  clicks90: number;
  position: number | null;
  ctr: number;
  words: number;
  lastUpdated: string;
  firstSeen: string;
};

/** One proposed edit; the article is rebuilt from the original plus the approved edits. */
export type ImprovementChange = {
  id: string;
  kind: "title" | "meta" | "rewrite" | "add" | "removeLink";
  status: "pending" | "approved" | "rejected";
  /** rewrite: the section replaced; add: the section it goes after (-1 = after the introduction). */
  sectionIndex?: number;
  heading?: string;
  original?: string;
  suggested: string;
  reason?: string;
  linkUrl?: string;
  linkReason?: "broken" | "competitor";
};

export type SafetyFlag = { check: string; detail: string; changeId?: string };

/** The WordPress post behind an improvement of a post Vaultio didn't write. */
export type ImprovementWordpressPost = {
  postId: number;
  link: string;
  editUrl?: string;
  /** Whether the post title / excerpt is what search engines see (not a custom title or description set in an SEO plugin). */
  titleWritable?: boolean;
  metaWritable?: boolean;
  /** Page builder that keeps its own copy of the content (the post can't be edited safely). */
  builder?: string;
};

/** Rewrites of published articles, chosen from Search Console opportunities. */
export const articleImprovements = pgTable(
  "article_improvements",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    pageUrl: text("page_url").notNull(),
    /** "vaultio": an article Vaultio wrote; "wordpress": an existing post on the client's WordPress site. */
    source: text("source").$type<"vaultio" | "wordpress">().notNull().default("vaultio"),
    articleId: integer("article_id").references(() => articles.id, { onDelete: "set null" }),
    wordpress: jsonb("wordpress").$type<ImprovementWordpressPost>(),
    status: text("status").$type<ImprovementStatus>().notNull(),
    opportunity: text("opportunity").$type<Opportunity>(),
    gscSnapshot: jsonb("gsc_snapshot").$type<ImprovementEvidence>(),
    scheduledFor: date("scheduled_for"),
    reason: text("reason"),
    originalTitle: text("original_title"),
    originalMeta: text("original_meta"),
    originalContent: text("original_content"),
    improvedContent: text("improved_content"),
    changes: jsonb("changes").$type<ImprovementChange[]>().notNull().default([]),
    safetyFlags: jsonb("safety_flags").$type<SafetyFlag[]>().notNull().default([]),
    queries: jsonb("queries").$type<{ query: string; clicks: number; impressions: number; position: number }[]>().notNull().default([]),
    error: text("error"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("article_improvements_site_idx").on(t.orgWebsiteId, t.status)],
);

/** Where a catalog product comes from. File imports count as manual products. */
export const PRODUCT_SOURCES = ["manual", "shopify", "woocommerce", "google_shopping", "facebook"] as const;
export type ProductSource = (typeof PRODUCT_SOURCES)[number];

/** The client's products (Settings → Product catalog), featured and linked in articles. */
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    source: text("source").$type<ProductSource>().notNull(),
    /** The product's id in its store, feed or import file (none for products added one by one). */
    externalId: text("external_id"),
    name: text("name").notNull(),
    description: text("description"),
    url: text("url"),
    imageUrl: text("image_url"),
    price: text("price"),
    currency: text("currency"),
    brand: text("brand"),
    category: text("category"),
    status: text("status").$type<"active" | "draft">().notNull().default("active"),
    variants: integer("variants").notNull().default(1),
    /** Whether articles may feature it (needs a product URL). Kept across syncs. */
    includeInArticles: boolean("include_in_articles").notNull().default(true),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("products_site_idx").on(t.orgWebsiteId, t.source), uniqueIndex("products_site_external_idx").on(t.orgWebsiteId, t.source, t.externalId)],
);

/** A product as featured in an article (kept as it was when the article was written). */
export type FeaturedProduct = { id: number; name: string; url: string; imageUrl: string | null; price: string | null; currency: string | null };

/** A proposal from the article assistant: replace one block of the article (checked against its text before applying). */
export type AssistantProposal = { blockIndex: number; originalText: string; html: string; reason: string; status?: "accepted" | "rejected" };

/** The AI article assistant's conversation for one article (shared by the workspace's editors). */
export const articleAssistantMessages = pgTable(
  "article_assistant_messages",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "assistant">().notNull(),
    content: text("content").notNull(),
    proposals: jsonb("proposals").$type<AssistantProposal[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("article_assistant_article_idx").on(t.articleId, t.createdAt)],
);
