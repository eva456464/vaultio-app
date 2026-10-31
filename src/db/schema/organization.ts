// Workspaces (agencies or single businesses), their members, white-label config and sites.
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export type MemberRole = "admin" | "member";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  creatorId: text("creator_id").references(() => user.id, { onDelete: "set null" }),
  isAgency: boolean("is_agency").notNull().default(false),
  acquisitionChannel: text("acquisition_channel"),
  stripeCustomerId: text("stripe_customer_id"),
  // Not billed (e.g. the platform owner's own workspace): agents run on Scale limits without a subscription.
  billingExempt: boolean("billing_exempt").notNull().default(false),
  ...timestamps,
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<MemberRole>().notNull().default("member"),
    // When false the member can only see the sites listed in member_website_access.
    allWebsites: boolean("all_websites").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("organization_members_org_user_idx").on(t.organizationId, t.userId)],
);

export const organizationInvitations = pgTable("organization_invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").$type<MemberRole>().notNull().default("member"),
  websiteIds: jsonb("website_ids").$type<number[]>().notNull().default([]),
  token: text("token").notNull().unique(),
  invitedById: text("invited_by_id").references(() => user.id, { onDelete: "set null" }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  platformLanguage: text("platform_language").notNull().default("en"),
  newsSubscribed: boolean("news_subscribed").notNull().default(true),
  isInvoiceEmailEnabled: boolean("is_invoice_email_enabled").notNull().default(true),
  referralCode: text("referral_code"),
  hasWatchedWelcomeVideo: boolean("has_watched_welcome_video").notNull().default(false),
  hasSeenArticleHints: boolean("has_seen_article_hints").notNull().default(false),
  completedSetupItems: jsonb("completed_setup_items").$type<string[]>().notNull().default([]),
  lastSeenProductUpdateAt: timestamp("last_seen_product_update_at", { withTimezone: true }),
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export type WhitelabelEmailRecord = {
  record: "DKIM" | "SPF" | "MX";
  name: string;
  value: string;
  type: string;
  status: string;
  ttl?: string;
};

export const whitelabelConfigs = pgTable("whitelabel_configs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  domain: text("domain").unique(),
  brandName: text("brand_name").notNull(),
  primaryColor: text("primary_color").notNull().default("#E94545"),
  secondaryColor: text("secondary_color").notNull().default("#000000"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  sendingDomain: text("sending_domain"),
  defaultLanguage: text("default_language").notNull().default("en"),
  domainVerified: boolean("domain_verified").notNull().default(false),
  recommendedCname: text("recommended_cname"),
  emailDomainId: text("email_domain_id"),
  emailDomainStatus: text("email_domain_status"),
  emailDomainRecords: jsonb("email_domain_records").$type<WhitelabelEmailRecord[]>(),
  // DNS records the hosting domain needs (CNAME, plus a TXT ownership record on some hosts).
  domainRecords: jsonb("domain_records").$type<WhitelabelDnsRecord[]>(),
  domainError: text("domain_error"),
  domainCheckedAt: timestamp("domain_checked_at", { withTimezone: true }),
  emailCheckedAt: timestamp("email_checked_at", { withTimezone: true }),
  ...timestamps,
});

export type WhitelabelDnsRecord = { type: string; name: string; value: string };

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** Agency logos and favicons, converted to PNG and served at /brand-assets/<id>.png. */
export const brandAssets = pgTable("brand_assets", {
  id: text("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"logo" | "favicon">().notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServiceOffered = {
  kind: "product_line" | "service";
  name: string;
  sourceUrl?: string;
  amount?: string;
  priceType?: "from" | "fixed";
  currency?: string;
  period?: string;
  unit?: string;
};

export type BrandVoice = Partial<
  Record<
    | "pacing_and_flow"
    | "tone_and_emotion"
    | "figurative_language"
    | "perspective_and_voice"
    | "word_choice_and_vocabulary"
    | "sentence_structure_and_complexity"
    | "formatting_and_structural_elements"
    | "level_of_formality_and_personalization",
    string
  >
>;

export type CtaSettings = {
  map?: { enabled: boolean; lat?: number; lng?: number; address?: string; placeName?: string; mapsUrl?: string; imageUrl?: string };
  links?: { enabled: boolean; items: { label: string; url: string }[] };
  contact?: { enabled: boolean; email?: string; phone?: string; whatsapp?: string };
  /** A short paragraph promoting the business, before the FAQ. */
  promo?: { enabled: boolean };
};

export type OnboardingStatus = "not_started" | "in_progress" | "completed";

/** A customer website in one language. Called a "client" in agency mode. */
export const orgWebsites = pgTable(
  "org_websites",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    brandName: text("brand_name"),
    selectedLanguage: text("selected_language").notNull().default("en"),
    // The primary-language site that holds the main subscription, for language add-ons.
    primaryOrgWebsiteId: integer("primary_org_website_id"),
    creationSource: text("creation_source").notNull().default("web_app"),
    onboardingStatus: text("onboarding_status").$type<OnboardingStatus>().notNull().default("not_started"),
    lastCompletedOnboardingStep: text("last_completed_onboarding_step"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    isHidden: boolean("is_hidden").notNull().default(false),
    detectedPlatform: text("detected_platform"),
    logoUrl: text("logo_url"),
    screenshotUrl: text("screenshot_url"),
    timeZone: text("time_zone").notNull().default("America/Los_Angeles"),

    // Business profile
    description: text("description"),
    positioning: text("positioning"),
    industry: text("industry"),
    businessType: text("business_type"),
    targetAudience: jsonb("target_audience").$type<string[]>().notNull().default([]),
    mainServices: jsonb("main_services").$type<string[]>().notNull().default([]),
    servicesOffered: jsonb("services_offered").$type<ServiceOffered[]>().notNull().default([]),
    servicesOfferedUpdatedAt: timestamp("services_offered_updated_at", { withTimezone: true }),
    brandDescription: text("brand_description"),
    brandColor: text("brand_color"),
    brandSecondaryColor: text("brand_secondary_color"),
    brandVoice: jsonb("brand_voice").$type<BrandVoice>(),
    profileConfirmedAt: timestamp("profile_confirmed_at", { withTimezone: true }),
    exampleArticleUrl: text("example_article_url"),
    promoWebsiteUrl: text("promo_website_url"),
    sitemapUrl: text("sitemap_url"),
    researchUrls: jsonb("research_urls").$type<string[]>().notNull().default([]),
    // Search phrases potential customers use; seeds for keyword research.
    seedTopics: jsonb("seed_topics").$type<string[]>().notNull().default([]),

    // Writing settings
    articleInstructions: text("article_instructions"),
    articleDisclaimer: text("article_disclaimer"),
    englishType: text("english_type").notNull().default("american"),
    articleLengthTarget: integer("article_length_target").notNull().default(2000),
    authorName: text("author_name"),
    includePerspective: boolean("include_perspective").notNull().default(true),
    includeToc: boolean("include_toc").notNull().default(true),
    includeTldr: boolean("include_tldr").notNull().default(true),
    summaryStyle: text("summary_style").notNull().default("tldr"),
    includeRecommendedReads: boolean("include_recommended_reads").notNull().default(true),
    includeSourcesSection: boolean("include_sources_section").notNull().default(true),
    includeCitation: boolean("include_citation").notNull().default(true),
    mentionCompetitorsIfRelevant: boolean("mention_competitors_if_relevant").notNull().default(false),
    includeJsonLd: boolean("include_json_ld").notNull().default(true),
    includeFaqJsonLd: boolean("include_faq_json_ld").notNull().default(true),
    includeInternalLinks: boolean("include_internal_links").notNull().default(true),
    includeYoutube: boolean("include_youtube").notNull().default(false),
    youtubeChannel: text("youtube_channel"),
    includeCtaImage: boolean("include_cta_image").notNull().default(true),
    ctaSettings: jsonb("cta_settings").$type<CtaSettings>(),
    citationRegion: text("citation_region").notNull().default("worldwide"),
    useWwwInLinks: boolean("use_www_in_links").notNull().default(false),
    useTrailingSlashInLinks: boolean("use_trailing_slash_in_links").notNull().default(false),

    // Visual settings
    imageInstructions: text("image_instructions"),
    // How the brand should look in images (mood, light, palette); guides every generated image.
    imageMood: text("image_mood"),
    heroImageStyle: text("hero_image_style").notNull().default("realistic_with_title"),
    bodyImageStyle: text("body_image_style").notNull().default("realistic"),
    infographicStyle: text("infographic_style").notNull().default("editorial"),
    // One chart-style image per article, from a section worth charting (on by default).
    includeInfographic: boolean("include_infographic").notNull().default(true),

    // Schedule
    articleScheduleWeekdays: jsonb("article_schedule_weekdays").$type<number[]>().notNull().default([]),
    autoPublish: boolean("auto_publish").notNull().default(true),

    // Improvements
    improvementsEnabled: boolean("improvements_enabled").notNull().default(false),
    improvementWeekdays: jsonb("improvement_weekdays").$type<number[]>().notNull().default([]),
    improvementsAutoPublish: boolean("improvements_auto_publish").notNull().default(false),

    // Backlinks
    backlinksEnabled: boolean("backlinks_enabled").notNull().default(true),
    domainRating: integer("domain_rating"),
    minBacklinkGiverDomainRating: integer("min_backlink_giver_domain_rating"),

    // Blog / publishing
    blogPath: text("blog_path").notNull().default("/blog"),

    ...timestamps,
  },
  (t) => [index("org_websites_org_idx").on(t.organizationId)],
);

export const memberWebsiteAccess = pgTable(
  "member_website_access",
  {
    memberId: integer("member_id")
      .notNull()
      .references(() => organizationMembers.id, { onDelete: "cascade" }),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.orgWebsiteId] })],
);

export const competitors = pgTable(
  "competitors",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    organicTraffic: integer("organic_traffic"),
    lastAnalyzedDate: date("last_analyzed_date"),
    ...timestamps,
  },
  (t) => [index("competitors_site_idx").on(t.orgWebsiteId)],
);

/** Target countries and cities ("Where you sell"). */
export const targetLocations = pgTable("target_locations", {
  id: serial("id").primaryKey(),
  orgWebsiteId: integer("org_website_id")
    .notNull()
    .references(() => orgWebsites.id, { onDelete: "cascade" }),
  locationCode: integer("location_code").notNull(),
  name: text("name").notNull(),
  countryCode: text("country_code"),
  kind: text("kind").$type<"country" | "city">().notNull().default("country"),
  parentId: integer("parent_id"),
  ...timestamps,
});

/** Pages of the customer's site, synced from the sitemap. */
export const sitePages = pgTable(
  "site_pages",
  {
    id: serial("id").primaryKey(),
    orgWebsiteId: integer("org_website_id")
      .notNull()
      .references(() => orgWebsites.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    metaTitle: text("meta_title"),
    lastModifiedAt: timestamp("last_modified_at", { withTimezone: true }),
    isSaved: boolean("is_saved").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("site_pages_site_url_idx").on(t.orgWebsiteId, t.url)],
);
