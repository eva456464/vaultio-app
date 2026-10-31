# Backend API — consolidated

Three companion files:
- `ENDPOINTS.generated.md` — every endpoint **actually observed** (80 GETs + the app's own POST preview), with real query params and full response *shapes*. Real (redacted) bodies in `api/<page>.json`.
- `API-MAP-FROM-BUNDLE.md` — the app's complete endpoint constant map (≈300 routes incl. writes, admin) extracted from the JS bundle.
- `API-SERVICES-FROM-BUNDLE.md` — client service functions → HTTP method → path expression (writes included).

## Stack & conventions
- **Frontend:** Next.js App Router (Turbopack build, RSC `?_rsc=` navigations), React, Tailwind v4, Radix/shadcn-style primitives, lucide icons, Recharts, TipTap editor, next-intl style locale prefix (`/en`, `/fr`, `/nl`, `/de`, `/es`, `/pt`, `/it`). Same build serves `www.babylovegrowth.ai` and white-label domains (`app.vaultio.co`), branding resolved per hostname (cookie `whitelabel_config`).
- **API:** `https://api.babylovegrowth.ai/api/...` REST/JSON via axios (XHR). Envelope usually `{message, data}`; some endpoints return bare arrays/objects.
- **Auth:** JWT `access_token` + `refresh_token` cookies (readable by JS, set on the app domain) → header `Authorization: Bearer <access_token>`. Refresh via `POST /auth/refresh-token {refreshToken}`. Users are Supabase Auth users (`supabaseId`); sign-in methods: password, magic link/code (`sign-in-link`, `verify-sign-in-code`, Cloudflare Turnstile token), Google OAuth.
- **Site scoping:** header `x-org-website-id: <id>` on every request + cookie `org_website_id` (selected site). Some endpoints also take `?orgWebsiteId=`.
- **No websockets/realtime observed**; long tasks use `GET /async-jobs` polling.
- **Third parties:** Stripe (billing; raw Stripe objects returned), Resend (email + domain DKIM), Vercel (custom domain verification, `recommendedCname`), Supabase Storage (`csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/{user-uploads,whitelabel,blog-images}`), media CDN `media.babylovegrowth.ai` (`/blog-images/organization-<orgId>/...`, `/articles/organization-<orgId>/<id>-<slug>.md`), Google OAuth (GSC `webmasters.readonly`, GA4 `analytics.readonly`), Meta Graph (FB Page + IG), Ahrefs (Domain Rating, "Powered by Ahrefs"), DataForSEO-like keyword/location data, Unsplash + AI images, LLM providers (OpenAI, Anthropic, Google) for AI-visibility checks, Reditus + Tremendous (referrals), Intercom (support chat, BLG only), PostHog (proxied at `/ingest`, surveys, session recording), Sentry, GTM/GA4, Meta/TikTok/LinkedIn/Reddit/OpenAI ad pixels, Rewardful, Convex site (`aromatic-caribou-889.convex.site`, attribution/affiliate events), an AWS ECS events collector.

## Endpoints by feature (observed = ✓; from bundle only = B)

### Session / account
| Method | Path | Purpose | |
|---|---|---|---|
| GET | `/users/me` | current user (flags, referral code, lifecycle) | ✓ |
| PUT | `/users/me` | update name/language/flags | B |
| DELETE | `/users/me` · POST `/users/me/restore` | 14-day soft delete / restore | B |
| GET | `/auth/sign-in-methods` | `{hasPassword}` | ✓ |
| POST | `/auth/sign-in`, `/auth/sign-in-link`, `/auth/verify-sign-in-link`, `/auth/verify-sign-in-code`, `/auth/sign-up`, `/auth/sign-up-invite-code`, `/auth/sign-in-google(-callback)`, `/auth/sign-in-with-callback`, `/auth/change-password`, `/auth/reset-password-request`, `/auth/verify-email`, `/auth/resend-verify-email`, `/auth/refresh-token`, `/auth/logout` | auth flows | B |

### Organization / websites
| GET | `/organization` | org + members | ✓ |
| GET | `/organization/get-org-websites` | all sites (selector, clients list) | ✓ |
| GET | `/organization/get-org-website` | selected site full settings (see data-model) | ✓ |
| PUT | `/organization/update-org-website` | save any site setting (writing, visuals, schedule, branding…) | B |
| PUT | `/organization/update` | rename workspace | B |
| POST | `/organization/invite-member` `{email, role, websiteIds}` · DELETE `/organization/remove-member/:id` · POST `/organization/user-website-access` | team | B |
| POST | `/organization/create-org-website`, `/organization/add-org-website`, `/onboarding/start`; GET `/onboarding/status` | add site / onboarding | B / ✓ |
| GET/PUT | `/organization/business-profile` | services offered, positioning, business type | ✓ / B |
| POST | `/organization/generate-description-from-url`, `/organization/detect-brand-colors`, `/organization/run-brand-analysis`, `/organization/content-strategy-preview` | AI helpers (Generate with AI) | B |
| GET | `/organization/language-upsell` | `{suggestion:{nextProposedLanguageCode}}` | ✓ |
| GET | `/organization/website-metrics-history?period=` | DR/metrics history | ✓ |
| POST | `/organization/generate-api-key` `{source}` · DELETE `/organization/api-key` | API key | B |
| POST | `/organization/connect-nextjs-blog` / `disconnect-nextjs-blog` | Next.js blog | B |
| GET | `/competitor` | competitors | ✓ |
| GET | `/locations` · PUT `/locations` (save) · GET `/locations/regen-status` | target locations | ✓/B |
| GET | `/pages?limit=50` · DELETE pages | sitemap pages ("Saved pages") | ✓ |
| GET | `/pages/articles-missing-in-sitemap` | `{articlesMissingInSitemap}` warning | ✓ |

### Overview
| GET | `/overview/agent-activities?tz=&date=` | activity feed window + planned actions | ✓ |
| GET | `/overview/milestones` · POST `/overview/milestones/seen` | achievements | ✓ / B |
| GET | `/overview/setup-checklist` | onboarding checklist | ✓ |
| GET | `/overview/achievements` | backlink achievements (backlinks page) | ✓ |

### Content
| GET | `/content-plan` | full plan (all items with article + cluster) | ✓ |
| GET | `/content-plan/get-unused-clusters` | alternative topics for "Change topic" | ✓ |
| PATCH | `/<base>/:orgWebsiteId/content-plan/:id` | change topic / add instructions / move | B |
| DELETE | `/<base>/:orgWebsiteId/content-plan/:id` | delete upcoming topic | B |
| POST | `/<base>/:orgWebsiteId/regenerate-content-plan`, `/reset-content-plan` | regenerate plan | B |
| GET | `/articles` · `/articles/:id` · `/articles/latest` · `/articles/:id/download` · `/articles/:id/export-html` | articles | ✓ / B |
| PUT | `/articles/:id` | save editor changes | B |
| POST | `/articles/:id/unpublish`, `/articles/:id/upload-image`, `/articles/rewrite-text`, regenerate-with-feedback, feedback, AI assistant (ask / clear / proposals PATCH) | article actions | B |
| GET | `/articles/:id/recommended-images` | image suggestions in editor | ✓ |
| GET | `/article-improvements`, `/candidates`, `/pending-count`, `/settings` | improvements | ✓ |
| POST/PUT/DELETE | `/instructions/revise`, `/instructions/remove-line`, `/instructions/dismiss-unsupported` | AI-normalised writing/image instructions | B |

### Backlinks
| GET | `/backlinks` | `{creditBalance, given[], received[]}` | ✓ |
| GET | `/backlinks/exchange-pool` | `{poolCount}` | ✓ |
| PUT | `/<base>/:orgWebsiteId/backlink-eligibility` | exchange on/off | B |
| (Stripe) | `subscriptions … type=backlink_credits` | buy credits ("Add credits") | ✓ |

### Site health (GEO audit)
| GET | `/geo-audit/data?orgWebsiteId=` | scores, crawler files, pages, issues | ✓ |
| GET | `/geo-audit/selectable-pages` · PUT `/geo-audit/selected-pages` | choose ≤20 pages | ✓ / B |
| GET | `/geo-audit/share-link?orgWebsiteId=` | public share URL | ✓ |
| POST | `/geo-audit/start`, `/geo-audit/restart-resolved`, `/geo-audit/validate-fix` | rerun / validate | B |

### AI visibility
| GET | `/llm-visibility/overall-insights`, `/history`, `/top-sources[?promptId=]`, `/brands-mentioned[?promptId=]`, `/prompts`, `/prompts/:id`, `/prompt-allowance` | | ✓ |
| POST/PUT/DELETE | `/llm-visibility/prompts[/:id]` | add / toggle / delete prompt | B |

### Socials
| GET | `/reddit/configuration`, `/reddit/subreddits`, `/reddit/relevant-posts?page=&limit=&filter=all` | Reddit agent | ✓ |
| GET | `/quora/configuration`, `/quora/relevant-posts?page=&limit=&filter=all` | Quora agent | ✓ |
| (B) | keyword CRUD, mark replied, discard, draft reply, reply instructions | | B |
| GET | `/meta-posting/feature-status`, `/meta-posting/settings`, `/meta-posting/posts`, `/:orgWebsiteId/meta-posting/articles?days=` | IG/FB | ✓ |
| PATCH/POST/DELETE | `/meta-posting/settings`, posts approve/dismiss/publish/update, connection validate/disconnect | | B |
| GET | `/gbp/availability` (+ GBP settings/sync/suggestions — "Soon") | Google Business Profile | ✓/B |

### Analytics
| GET | `/gsc/metrics/timeseries?period=`, `/gsc/metrics/pages?page=&limit=`, `/gsc/metrics/queries?page=&limit=`, `/gsc/metrics/countries?period=`, `/gsc/account-info`, `/gsc/generate-gsc-consent-url?redirectPath=` | Search Console | ✓ |
| POST/PUT/DELETE | `/gsc/handle-gsc-callback`, `/gsc/properties`, `/gsc/selected-property`, `/gsc/auto-select-property`, `/gsc/disconnect` | | B |
| GET | `/ga4/status`, `/ga4/account-info`, `/ga4/overall-overview?range=`, `/ga4/channel-timeseries?range=`, `/ga4/channel-breakdown?range=`, `/ga4/traffic-pages?range=&page=&limit=`, `/ga4/ai-overview`, `/ga4/ai-sources`, `/ga4/ai-sources-timeseries`, `/ga4/ai-pages`, `/ga4/ai-source-page-mapping` | GA4 | ✓ |
| POST/PUT/DELETE | `/ga4/generate-ga4-consent-url`, `/ga4/handle-ga4-callback`, `/ga4/properties`, `/ga4/selected-property`, `/ga4/disconnect`, resync | | B |

### Integrations / publishing
| GET | `/integrations` | per-CMS connection objects (`wordpress, wordpressCom, wix, shopify, webflow, webhook, wordpressWebhook, bigcommerce, snapps, ghost, gohighlevel, blog`) + `apiKey`, `nextjsBlogConnected` | ✓ |
| POST | `/integrations/detect-platform(/persist)` | detect CMS | B |
| (B) | per-platform connect/disconnect, hosted blog (`HOSTED_BLOG` group: DNS, verify), webhooks | | B |
| GET | `/product-catalog/status` (+ products, feed, Shopify/WooCommerce connect, sync) | product catalog | ✓/B |

### Billing
| GET | `/subscriptions/get-org-website-subscription?type=main|llm_visibility_prompts|reddit|reddit_autopilot|quora|backlink_credits|meta_autopilot` | raw Stripe subscription | ✓ |
| GET | `/subscriptions/invoices?type=…`, `/subscriptions/organization-invoices` | invoices | ✓ |
| GET | `/subscriptions/language-addition-eligibility` · POST `/subscriptions/add-language-addition` | languages | ✓/B |
| POST | `/subscriptions/create-subscription`, `/create-customer-checkout`, `/create-portal-session`, `/update-subscription`, `/cancel-subscription`, `/reconcile-plan-change`; `/retention/available-offers`, `/retention/apply-offer` | Stripe flows | B |

### Agency / white label / reporting
| GET | `/whitelabel/setup` · POST `/whitelabel/setup`, `/whitelabel/logo` | branding, domain (Vercel), email domain (Resend) | ✓/B |
| GET | `/agency-reporting/availability?period=previous_month`, `/agency-reporting/settings` | | ✓ |
| POST | `/agency-reporting/preview` `{period, blocks{…}, kpiMetrics[]}` → HTML | live preview (called by the page itself) | ✓ |
| GET/POST | `/agency-reporting/pdf`, `/agency-reporting/reports` | PDF + history | B |

### Misc
| GET | `/async-jobs` (DELETE to dismiss) | background jobs | ✓ |
| GET | `/seo-specialist/balance`, `/booking-links`, `/bookings` · POST purchase | expert hours | ✓ |
| GET | `/achievement/trustpilot/status` · POST mark-used | review reward | ✓ |
| GET | `/reditus/auth-token`, `/reditus/referral-summary` | referrals | ✓ |
| POST | `/feature-request`, `/support/help-needed` | feedback / help | B |

## Inferred backend services / jobs
| Job | Cadence (from "Planned actions") | Produces |
|---|---|---|
| Sitemap sync | daily | `Page` rows, `sitemapSync {count}` |
| GA4 sync | daily | channel/AI metrics, `analyticsSync`, `aiTrafficReport` |
| Topic research + cannibalization check | daily (for tomorrow) | `topicResearched`, `cannibalizationCheck` |
| Article generation (LLM + images + links + schema) & publish to CMS | daily, before 11:00 UTC, on scheduled weekdays | `Article`, `articlePublished` |
| Social carousel generation & posting (Meta Graph) | after publish; weekly (Grow) / daily (Scale) at chosen time | `MetaPost`, `socialPostPublished` |
| Backlink exchange matcher (insert contextual links into partners' upcoming articles, credit accounting, crawler verifying presence/follow type) | continuous | `Backlink`, `backlinkReceived` |
| Google rankings check (GSC queries) | every ~3 days | `rankingsCheck`, keyword-band milestones |
| AI visibility check (ask OpenAI/Anthropic/Google models each active prompt; parse mentions, brands, sources, sentiment) | weekly (Mon); "refreshed daily" for prompt packs | `LlmAnswer`, `aiVisibilityCheck` |
| Site health crawl (homepage + ≤20 pages; PageSpeed, technical SEO, LLM optimisation, robots/sitemap/llms.txt) | weekly | `GeoAudit`, `siteHealthAudit` |
| Domain rating check (Ahrefs) | periodic (≈ monthly) | `domainRatingCheck`, DR milestones |
| Competitor content-gap scan | weekly | `competitorGapScan`, new topics (`topicsPlanned`) |
| Reddit/Quora monitoring (Google search for keyword + Reddit/Quora API, LLM scoring, suggested reply) | daily (`nextRunAt`, `dailyScheduleCap`) | opportunities |
| Article improvements (pick GSC-opportunity article, rewrite, optional auto-publish) | on chosen weekdays (≤2/week), scan "Next scan Nov 2" | `ArticleImprovement` |
| Milestone engine | after each sync | achievements, NEW badges |
| Monthly agency report email (PDF) | monthly, previous month | report email |
| Lifecycle email sequences (Resend) | event-driven | abandoned/churned/onboarding/active-user emails |
| Onboarding pipeline (brand analysis, competitors, keyword research ~1.5K, prompts, 31-article plan, exchange enrollment, screenshot) | once per site | onboarding activities |
