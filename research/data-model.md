# Inferred data model

Inferred from real API responses (`api/*.json`), the bundle's endpoint map (`api/API-MAP-FROM-BUNDLE.md`) and the public docs (`docs/`). IDs are integers (Postgres serial/bigserial) unless noted. All timestamps are ISO UTC. Backend is a REST API (`api.babylovegrowth.ai/api/*`); auth users live in **Supabase Auth** (`users.supabaseId`), files in **Supabase Storage** + a media CDN (`media.babylovegrowth.ai`), billing in **Stripe**, transactional email via **Resend**, custom domains via **Vercel** domains API.

```
Organization 1─* User (members, role admin|member)
Organization 1─* OrgWebsite ("client"/"site"; one per site+language)
Organization 1─0..1 WhitelabelConfig
OrgWebsite 1─* Competitor
OrgWebsite 1─* Keyword / KeywordCluster 1─0..1 ContentPlanItem 1─0..1 Article
OrgWebsite 1─* Page (sitemap-synced pages of the customer site)
OrgWebsite 1─* Backlink (as source = given, as target = received)  + creditBalance
OrgWebsite 1─* GeoAudit 1─* GeoAuditPage 1─* GeoAuditIssue
OrgWebsite 1─* LlmPrompt 1─* LlmAnswer (per provider/model) → mentions, sources, brands
OrgWebsite 1─* RedditMonitoringKeyword 1─* RedditOpportunity *─1 RedditPost  (+ Subreddit list)
OrgWebsite 1─* QuoraMonitoringKeyword 1─* QuoraOpportunity *─1 QuoraPost
OrgWebsite 1─* MetaConnection, MetaPost (carousel per article), MetaPostingSettings
OrgWebsite 1─* Milestone/Achievement, AgentActivity (event log)
OrgWebsite 1─* GscDailyMetric, Ga4 daily channel/AI metrics, WebsiteMetricsHistory (DR etc.)
OrgWebsite 1─* ArticleImprovement
OrgWebsite 1─* Product (catalog), ProductCatalogFeed/Shopify/WooCommerce connection
OrgWebsite 1─* Integration connection (wordpress, wordpressCom, wix, shopify, webflow, webhook, wordpressWebhook, bigcommerce, snapps, ghost, gohighlevel, blog(hosted), nextjs) + apiKey
OrgWebsite 1─* Subscription (Stripe) by type; Invoices
OrgWebsite 1─1 AgencyReportingSettings 1─* AgencyReport
User 1─* SeoSpecialistBooking / hours balance
AsyncJob (per org website, background task tracking)
```

## Organization
`id, name, creatorId, gscCredentials(null), acquisitionChannel, createdAt, updatedAt, members[]`.
Agency/workspace container. Agency pages: "Workspace name", members & roles, invites (`organization/invite-member` with `{email, role, websiteIds}` → per-user website access via `organization/user-website-access`).

## User
`id, email, name, isActive, role ("admin"|"member"), stripeCustomerId, newsSubscribed, isInvoiceEmailEnabled, platformLanguage ("en"…), referralCode, linkedinPostCompleted, linkedinExperiencePostCompleted, isG2ReviewCompleted, hasWatchedWelcomeVideo, hasSeenArticleHints, watchedVideos[], completedSetupItems[], lastSeenProductUpdateAt (date), resendAbandonedStartedAt / resendChurnedStartedAt / resendOnboardingStartedAt / resendActiveUserStartedAt (lifecycle email sequences in Resend), deletionRequestedAt (14-day soft delete), lastLoginAt, supabaseId (uuid), organizationId, websiteAccess[]`.
Member status in UI: `Active` / `Pending` (invited, not yet signed up).

## OrgWebsite (the core "site/client" entity)
Identity & onboarding: `id, organizationId, url, creationSource ("web_app"), brandName, selectedLanguage ("en"), onboardingStatus ("not_started"|"completed"|…), lastCompletedOnboardingStep, onboardingCompletedAt, reonboardedAt, isHidden, createdAt, updatedAt, detectedPlatform ("nextjs"…), screenshotUrl, screenshotLinkUrl, logoUrl`.
Business profile: `description, targetAudience[] (strings), mainServices[], industry ("marketing"), brandDescription, brandColor, brandSecondaryColor, brandVoice{pacing_and_flow, tone_and_emotion, figurative_language, perspective_and_voice, word_choice_and_vocabulary, sentence_structure_and_complexity, formatting_and_structural_elements, level_of_formality_and_personalization}, exampleArticleUrl, promoWebsiteUrl, sitemapUrl, researchUrls[]`.
Business-profile endpoint adds: `servicesOffered[{kind:"product_line"|"service", name, sourceUrl, amount, priceType:"from"|"fixed", currency, period:"month", unit}], servicesOfferedUpdatedAt, servicesOfferedSource, positioning (≤500 chars), businessType` (max 20 offers).
Writing settings: `articleInstructions (newline list), articleDisclaimer, instructionNotes{writing{revisions[{at,added[],removed[],source,summary,settings[]}],unsupported[]}, images{…}, reviewedAt}, englishType ("american"|"british"…), articleLengthTarget (2000), authorName, includePerspective, includeToc, includeTldr, summaryStyle ("tldr"|"key_takeaways"), includeRecommendedReads, includeSourcesSection, includeCitation, mentionCompetitorsIfRelevant, includeJsonLd, includeFaqJsonLd, includeInternalLinks, includeYoutube, youtubeChannel, includeCTAImage, ctaSettings{map{enabled,lat,lng,address,placeName,mapsUrl,imageKey,imageUrl}, links{enabled, items[{label,url}]}, contact{enabled,email,phone,whatsapp}}, citationRegion ("worldwide"), useWwwInLinks, useTrailingSlashInLinks`.
Visual settings: `imageInstructions, heroImageStyle ("realistic_with_title"|…), bodyImageStyle ("realistic"|…), infographicStyle ("editorial"|"classic")`.
Schedule: `articleScheduleWeekdays[] (empty = every day), autoPublish`.
Improvements: `improvementsEnabled, improvementWeekdays[] (≤2), improvementsAutoPublish`.
Backlinks: `backlinksEnabled, backlinksExchangeEligible, domainRating, minBacklinkGiverDomainRating`.
Integrations: `apiKey (secret), apiKeySource, nextjsBlogConnected, blogPath, gscCredentials{OAuth tokens…}, selectedGscProperty ("sc-domain:vaultio.co"), gscDailyBackfilledFrom, ga4Credentials{…}, selectedGa4Property ("properties/…"), ga4InitialSyncCompleted`.
Multi-language: one OrgWebsite per language (language add-on via Stripe; "+ Recommended Spanish" in selector).

## WhitelabelConfig (agency)
`id, organizationId, domain ("app.vaultio.co"), brandName, primaryColor, secondaryColor, logo, favicon (Supabase storage URLs under /whitelabel/<slug>/), sendingDomain, defaultLanguage, googleClientId, supabaseRedirectConfigured, wantsWhitelabel, createdAt, updatedAt` + live status: `appDomain{domain, verified, misconfigured, recommendedCname (Vercel DNS)}`, `emailDomain{id, name, status, region, records[{record:"DKIM"|"SPF"|"MX", name, value, type, status, ttl}]}` (Resend).
Frontend reads it per-hostname and stores a `whitelabel_config` cookie: `{domain, brandName, primaryColor, secondaryColor, logo, favicon, sendingDomain, defaultLanguage}`.

## Competitor
`id, url, orgWebsiteId, organicTraffic, lastAnalyzedDate, createdAt, updatedAt` (10 found at onboarding).

## Keyword / KeywordCluster / ContentPlanItem / Article
- **SeedKeyword:** `id, value, avgSearchVolume, keywordDifficulty (0–100), averageCpc, averageIntent, articleType ("guide_explainer"|"guide_how_to"|"listicle_educational"|…), languageCode`.
- **KeywordCluster:** `id, seedKeywordId, totalSearchVolume, averageIntent, creationSource, locationName, commonUrls[], orgWebsiteId, articleGenerationAttempts, score`. Unused clusters (`content-plan/get-unused-clusters`): `{clusterId, keyword, searchVolume, keywordDifficulty, source, articleType}` (~196 available) — used by "Change topic".
- **ContentPlanItem:** `id, orgWebsiteId, scheduledFor (date), userInstruction, supportUrl, proposedProductIds[], selectedProductIds[], articleId, keywordClusterId, generationStatus ("published"|"queued"|…), scheduledOnDisabledWeekday, isLocalKeyword, keywordLocation, gscPerformance, createdAt, updatedAt` + embeds `article{…}`, `keywordCluster{seedKeyword}`. Statuses in UI: `PUBLISHED`, `QUEUED` (+ `Local` tag). Counts `126 PUBLISHED · 29 QUEUED`.
- **Article:** `id, orgWebsiteId, title, slug, metaDescription (≤160), languageCode, keywordClusterId, content (markdown), formattedContent, htmlContent, outline[], mediaQueries[{type, altText, elementId, identifier ("hero_image"…), searchTerm, heroPromptKind, generationPrompt}], media[{url, type, source ("Unsplash"|AI), altText, selected, identifier, thumbnailUrl}], jsonLd, faqJsonLd, publicUrl (markdown on CDN), downloaded, isHappyFeedback, feedbackComment, seoScore (0–100), wordCount, internalLinksCount, externalLinksCount, backlinksCount, publishedUrl, publishedAt, lastUrlCheckAt, generationRationale{brand, keyword, audience, … why topic/structure/characteristics}, generationSettings, aiImageRegenerationCount, ctaCards{cards[{kind:"link", slot:"after_tldr", title, pitch, …}]}, canRegenerate, createdAt, updatedAt`.
  Article actions (bundle): edit (PUT), unpublish, delete, download, export-html, upload-image, rewrite-text, regenerate-with-feedback, feedback, AI assistant conversation, rewrite proposals (accept/reject).
- **"AI Search optimized" checks** (UI list, 10): Answer-first writing, Credible source, Optimal structure, Internal links, Statistics data points, Plagiarism check passed, Image alt texts, Semantic keywords, Optimized meta tags, JSON-LD schema.

## ArticleImprovement
Rewrites of existing published pages chosen from GSC opportunity; endpoints `article-improvements`, `/candidates`, `/pending-count`, `/settings`; page `/dashboard/content-plan/improvements/:id`. Settings: `improvementsEnabled, improvementWeekdays[], improvementsAutoPublish, gscConnected, hasUpdateCapableIntegration`.

## Page (customer site pages)
`id, url, metaTitle, lastModifiedAt` — from sitemap sync; used for internal linking, "Saved pages" settings, site-health page picker (`geo-audit/selectable-pages`), cannibalization checks.

## Backlink (exchange)
`id, sourceOrgWebsiteId, targetOrgWebsiteId, url (page containing link), isBacklinkPresent, articleId, articleClusterId, linkPower (= giver DR), becameOnlineAt, removedAt, blgRemovedAt, lastCrawledAt, followType ("dofollow"|"nofollow"), nofollowEmailSentAt, backlinkExplanation, createdAt, updatedAt` + joins (`targetOrgWebsite.url`, `sourceOrgWebsite.url`, `article{title,publishedUrl,publishedAt}`, `keywordCluster.contentPlan.scheduledFor`).
`GET /backlinks` → `{creditBalance, given[], received[]}`; `exchange-pool` → `{poolCount}`. Credits: start 100; earn = your DR (max 25) per link given; spend = giver DR per link received; balance may go negative. Match range DR band (e.g. 17–100). Value shown ≈ $250/link (DR-priced).

## GeoAudit (Site health)
`{averageGeoScore, averagePageSpeed, llmOptimizationScore, technicalSeoScore, overallScore, robotsTxt{status}, sitemap{status}, llmTxt{status}, pages[{url, geoScore, issueCount, issues[{id, geoAuditId, issueType, description, pageId, severity ("low"|"medium"|"high"), action, fixedAt, createdAt}]}], auditDate, nextScheduledAuditAt, pagesAudited, inProgress}`; homepage + up to 20 pages, every 7 days; share link (public read-only page `/geo-audit/public/share/:token`).

## LLM visibility
- **LlmPrompt:** `id, orgWebsiteId, prompt, intent ("awareness"|"tofu"|"mofu"|"bofu"|…), tierLabel ("Awareness"|"Research"|"Comparison"|"Learning"|"Buying intent"|"Other"), isActive, lastCheckedAt, providers[], providersWithMentions[], sentiment, createdAt, updatedAt`. Allowance (`prompt-allowance`): 10 on Grow; packs +30 ($49/mo) / +50 ($89/mo).
- **LlmAnswer:** `id, promptId, answer (markdown), orgWebsiteMentioned, llmProvider ("anthropic"|"openai"|"google"…), llmModel (e.g. "claude-haiku-…", "gpt-4o-mini"), createdAt`.
- Derived: `topSources[{domain, count, urls[{url, sourceType:"resource_page"|"category_page"|"blog"…}]}]`, `topBrands`/brands-mentioned `{brandName, brandUrl, count, visibility%, sentiment 0–100}`, `overall-insights{visibilityScore, totalMentions, totalAnswers, totalPrompts, topSource, topMentionedBrand}`, `history` (score over time).

## Reddit / Quora opportunities
- **Configuration:** `keywords[{id, orgWebsiteId, keyword, isActive, lastGoogleCheckedAt, lastRedditCheckedAt, searchVolume, cpc, createdAt}], maxKeywords, autopilotEnabled, replyInstructions, nextRunAt, dailyScheduleCap, scheduledToday` (+ `subreddits[{id, subreddit}]`).
- **RedditOpportunity:** `id, redditPostId, redditMonitoringKeywordId, opportunityScore, llmRelevanceScore, engagementScore, recencyScore, reasoning, source, suggestedComment, markedAsCommentedAt, discardedAt, orgWebsiteId` + `redditPost{redditId, subreddit, title, text, author, upvotes, numComments, url, postCreatedAt}` + `monitoringKeyword`. Tabs `To reply` / `Replied` (filter=all|…); paged.
- **QuoraOpportunity:** same pattern with `quoraPost{quoraId, question, author, followers, viewCount, answerCount, url}`.

## Meta (Instagram & Facebook) posting
- **Connection:** `id, facebookPageId, facebookPageName, facebookPictureUrl, instagramUserId, instagramUsername, instagramPictureUrl, status, grantedScopes[], pageTasks[], connectedAt, lastValidatedAt, tokenExpiresAt, lastErrorCode, lastErrorMessage`.
- **Feature status:** `canConnect, hasMetaAutopilot, hasScalePlan, cadence ("weekly"|"daily"), unconnectedPostLimit, generationPaused, connections[], publishConnectionId, lastConnectAttempt{…}`.
- **Settings:** `publishMode ("auto"|"auto_review"|"manual"), publishTime ("12:30"), publishWeekdays[], postToFacebook, postToInstagram, generationEnabled, showBrandMark, enabledPostTypes[] (educational|philosophical|myth_busting|storytelling), slideTextStyle, slideImageStyle ("photo_realistic"|…), publishConnectionId`.
- **MetaPost:** carousel per article (slides with text overlays), caption + hashtags, status (pending/approved/published/dismissed), posted URLs (`facebook.com/.../posts/...`, `instagram.com/p/...`).

## Agent activity (event log) & milestones
- **AgentActivity item:** `{type, date, day?, count?, total?, title?, articleId?, publishedUrl?, sourceUrl?, domainRating?}` — types: articlePublished, topicResearched, topicsPlanned, cannibalizationCheck, backlinkReceived, backlinkExchangeEnrolled, socialPostPublished, siteHealthAudit, aiVisibilityCheck, analyticsSync, aiTrafficReport, rankingsCheck, domainRatingCheck, sitemapSync, competitorGapScan, websiteAnalyzed, competitorsFound, keywordResearch, promptsGenerated, firstMonthPlanned. Future days list planned job runs.
- **Milestone card:** `{id, category, threshold, achievedAt, seenAt, value, gainLast7Days, nextThreshold, proof{kind,…}}` (categories listed in `pages/01-overview.md`); `unseen[]`; mark seen via `POST /overview/milestones/seen`.
- **Setup checklist:** keys `connect_website, connect_gsc, connect_ga4, connect_instagram, watch_walkthrough, read_docs`.

## Analytics
- **GSC daily:** `{id, date, clicks, impressions, ctr, position, orgWebsiteId}`; aggregates `total{clicks, impressions, avgPosition}, first, last`; pages/queries/countries tables (paged `page, limit`). Periods: `period=7d|30d|3m|…|all`.
- **GA4:** channel timeseries `{date, Direct, Paid, "Organic search", Other, "LLM referrers"}`, breakdown `{channelGroup, activeUsers, percentage}`, overall overview (active users, sessions, top channel, AI users), AI sources (ChatGPT, Perplexity, Gemini, Copilot, Claude, You.com, Phind, Poe, Groq, Meta AI), AI pages, AI source→page mapping, traffic pages. Ranges `range=1d|7d|30d|90d|12m|all`.
- **WebsiteMetricsHistory:** DR and other metrics over time (`organization/website-metrics-history?period=`).

## Billing (Stripe)
Subscriptions per org website and **type**: `main` (Grow/Scale plan), `llm_visibility_prompts`, `reddit`, `reddit_autopilot`, `quora`, `backlink_credits`, `meta_autopilot`; plus language additions (`language-addition-eligibility{hasScalePrimary, hasFreeSlotRemaining, slotsUsed, totalSlots, freeSlotsRemaining, languagePriceId, primaryStripeSubscriptionId, primaryOrgWebsiteId, pausedComplimentaryLanguages[]}`). `get-org-website-subscription?type=` returns the raw Stripe Subscription object. Invoices: `{id, created, amount_due, currency, status, invoice_pdf, websiteUrl}`. Actions: checkout session, portal session, update, cancel (with retention offers), pause billing.

## Agency reporting
Settings `{autoSend, recipientEmail, kpiMetrics[] (clicks|impressions|position), blockToggles{achievements, summary, kpis, clicksChart, countries, pages, keywords, articles, backlinks, siteHealth, community, aiVisibility}}`; `availability?period=previous_month`; `POST preview {period, blocks, kpiMetrics}` → HTML (A4, see `api/agency-reporting-preview.html`); `pdf`; `reports` (history).

## Other
- **SEO specialist:** balance `{availableMin, totalMin, blockedMin, upcomingHoldsMin, rows[], upcomingBookings[]}`, booking links, bookings, purchase ($150/h; 2 h/mo on Scale).
- **Product catalog:** status `{shopifyConnected, storeName, woocommerceConnected, siteUrl, productCount, shopifyProductCount, woocommerceProductCount, manualProductCount, feed, lastSyncAt, lastSyncStatus, lastSyncError}`; products manual/feed/Shopify/WooCommerce.
- **Locations:** `[{locationCode, subLocations[]}]` (DataForSEO-style location codes; target cities).
- **AsyncJob:** background job tracking list (`async-jobs`).
- **Referral (Reditus/Tremendous):** referral summary, $60 Visa per paying referral, friend gets 30% off 3 months.
- **Trustpilot / G2 / LinkedIn promo** state on user.
