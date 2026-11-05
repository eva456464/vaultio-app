# Babylovegrowth public site vs. research copy vs. Vaultio

Fetched 5 November 2026 from `https://www.babylovegrowth.ai` (public pages only, GET only). Compared with the
research copies on the `research` branch (`research/docs/*.md`, taken ~30 October 2026; `research/public-site.md`)
and with this repo (`src/`, `docs/STATUS.md`, `docs/ARCHITECTURE.md`).

Pages read: `/en` (home), `/en/pricing` (also with the "Pay yearly" toggle via Playwright), `/en/whitelabel`,
`/en/backlinks`, `/en/rank-on-llms`, `/en/ai-visibility`, `/en/mcp`, `/en/backlink-marketplace`, `/en/shopify`,
`/en/affiliate`, `/en/academy`, `/en/freebies`, `/en/blog` (index), all 39 URLs in `sitemap-docs.xml`.
Current text of every docs page is saved in [`docs-current/`](docs-current/) (URL at the top of each file).

## a) Docs pages not in the research copy

**None.** `sitemap-docs.xml` and the docs sidebar list the same 39 pages that are in `research/docs/`.
No changelog / "what's new" page exists (`/changelog` → `/en/changelog` → 404; `/en/updates`, `/en/whats-new` 404).
`web-check/docs/` is therefore not created.

New *non-docs* public pages relevant to features (not in `research/public-site.md`):

- `/en/backlink-marketplace` — **Publisher marketplace** (see c).
- `/en/mcp` — **BabyLoveGrowth MCP server** for Claude (`https://api.babylovegrowth.ai/api/mcp`) (see c).

Blog: 681 English posts in `sitemap-blog.xml` (plus fr/nl/de/es/pt/it copies). Latest titles (page 1 of `/en/blog`):
Searchable Review (Oct 30) · 10× "The N best free X alternatives in 2026" (Surfer, SpyFu, Similarweb, Semrush,
Screaming Frog, Moz, Hootsuite, Buffer, AnswerThePublic, Ahrefs; Oct 27) · Profound Review (Oct 14) · Peec AI
Review (Sep 16) · Distribb io review (Sep 11) · 15 White Label SEO Platforms for Agencies & SaaS With AI Visibility ·
Get Client Ready SEO Reporting in 2–3 Weeks for Agencies · Prove SEO & AI Visibility in 30 Days · Shopify SEO Apps
Improving Core Web Vitals, Schema, and AI Visibility · 300–500 Keyword Test: Keyword Clustering Tools · Agentic AI
SEO Platform for Agencies & Teams: 30 Day Content Plan · Earn High Authority Links: Digital PR · Rank Higher in 90
Days With SEO First Digital PR · Reddit Marketing for Brands: 30/90/180 Plan · Parasite SEO for Marketers · Get
Reddit Advertising Results in 4–12 Weeks · AI Visibility for Marketers · 30 Day LLM SEO Plan · Make AI Cite Your
Brand: AEO in 30–90 Days · 7 Keyword Research Tools That Fit an Automated SEO Workflow · Lead Generation Techniques.

## b) Docs pages whose content changed materially

Most pages changed only in wording ("website platforms" → "connect your website", "social presence" → "socials",
"comment" → "reply"). Material changes:

| Page | What changed | Vaultio impact |
|---|---|---|
| `dashboard/analytics` | **AI visibility tracks ChatGPT and Claude only — Gemini removed** from the docs (the pricing and white-label pages still say "ChatGPT, Claude & Gemini"). Prompt limit now "10 on Grow or 50 on Scale, plus any prompt add-ons". Clicks-by-country follows the selected KPI card (clicks / impressions / avg ranking). Top keywords: "BLG keyword" badge = search brought visitors to one of our articles, plus a "BLG keywords only" filter. | Vaultio tracks Claude + ChatGPT + Gemini (when keyed) — a superset. Limits match. |
| `dashboard/overview` | Rewritten for the new Overview: **agent activities card with a day stepper** (past days = done, future days = planned), featured article (keyword, volume, difficulty easy/medium/hard, "why this topic?"), **planned actions**, **Get started checklist** (connect website required; GSC, GA, Instagram, video, docs optional) replaced by **milestones** when unlocked, **achievements**, **"Here's what we learned about your brand"** (with "Looks good"), **traffic sources** card, **success story** (customer in your industry with a similar starting traffic, growth curve and "you are here"), **"You're in good hands"** (Google rating + money-back guarantee). | Vaultio Overview has activity, planned actions, achievements, brand profile, traffic sources (STATUS.md). Missing: day stepper into past/future days (check), Get-started checklist, success-story card, "good hands" card. |
| `dashboard/settings` | Settings regrouped: Business & brand (+ **Saved pages**), **Articles** (writing, visuals, schedule, **Improvements**), Socials (Reddit, Quora, Instagram & Facebook, Google Business), agency group. "Citation region" replaced by a **Citations on/off** switch. Visuals: cover, body images, infographics, video with style pickers ("Change style"). CTA cards in a separate "Call to actions" section with a "Set up" state. Schedule now "days new articles are **generated**". **Improvements: up to 2 days a week, needs GSC.** Notifications: product updates + **weekly progress email per website**. Referral reward = prepaid Visa card. Product catalog row gets "Page on your website" (articles link there). | Vaultio has Saved pages, Improvements (max 2 days, GSC), Visuals. **Weekly progress email: Vaultio only has a monthly report email.** Check whether Vaultio has a citations on/off switch (it has `includeSourcesSection`). |
| `dashboard/technical-audit` (Site health) | **Runs automatically once a week**, banner shows next run. **Health score = Page Speed 20% + LLM Optimization 40% + Technical SEO 40%** (was a plain average). LLM optimization now includes HTTPS and llms.txt; "SEO optimization" renamed **Technical SEO**. Issues can be grouped **by issue (default) or by page**. New checks: **H1 heading**, **Content gaps** ("customer questions the page doesn't answer"). llms.txt check = presence only. Title rule **45–60** chars (was 50–60); description **150–160** chars (was 120–160). | Vaultio: weekly (Tuesday) ✓; score = `0.4·avg page score + 0.3·technical + 0.3·LLM` (`src/server/agents/jobs/site-analysis.ts:209`) — **weights differ and page speed is not in the score**. H1 check ✓. **No content-gap check.** Title rule 30–60 / description 120–160 (`site-analysis.ts:99-103`) differ. Group-by-issue view: check UI. |
| `dashboard/backlinks` | **Earn up to 20 credits per link (was 25); up to 10 for sites on a platform address (e.g. `*.myshopify.com`)**; credits move once the link is confirmed live. **First backlinks 3–7 days after the plan is paid; none during a free trial** (was 15–20 days). Niche policy: illegal drugs, pharma/supplements, **crypto** excluded; **CBD, adult, gambling accepted where legal but only exchange within their own category; tobacco/vaping join the normal exchange**. Marketplace slots now depend on spare network capacity (was fixed 20). "How your DR grows" card renamed "Backlink exchange pool: your match range on the DR scale". | Vaultio: max 25 per link (`src/server/backlinks/exchange.ts:25`), no platform-address cap, no trial exclusion (agents run while `trialing`, `src/server/billing/entitlements.ts:11`), no niche categories. |
| `dashboard/content-plan` | New: **change a topic until the day before it is generated (paid) or same day (trial)**; **"Add keywords"** (comma-separated; grouped into topics and used after the current plan). | Vaultio has change topic and add keywords (STATUS.md); edit cut-off rule not checked. |
| `dashboard/article-quality` + `questions` | **Four article types**: explainers, how-to guides, educational listicles, product listicles (roundups/comparisons), matched to intent (informational / commercial / transactional). Writing described as "fully automatic AI writing, no person writing them" (was "AI + human expertise"). **Up to 10 internal links** (was 3–8) + "recommended article" section. **32 languages** (was "all major"). Results timeline rewritten (indexing days–4 weeks; first movement weeks 4–8; meaningful results 4–6 months, up to 12). **Backlink network "5,000+ sites"**. No refunds after trial except the **90-day money-back guarantee** or a confirmed bug. **Volume discount applies to each new website's plan; 2nd site full price, discount starts with the 3rd.** Add languages from the website menu. | Vaultio has 7 article types, 3–6 internal links (`writer.ts:54`), no "recommended article" section, 36 languages, no volume discounts (STATUS.md). |
| `dashboard/reddit`, `quora` | **Reddit autopilot removed from the docs** (posting is now manual: Copy & open → Mark as replied, "Not relevant" to dismiss). Opportunity rows show *why* found: monitored keyword, **a Google ranking for that keyword**, or **a trending topic in the subreddit**. | Vaultio already manual-only. "Trending topic in subreddit" source: not in Vaultio. |
| `dashboard/meta-posting` | Pick any page in Facebook's dialog, then choose the posting page (switch later with "Post here instead"); FB/IG toggles in a "Connected accounts" card; modes renamed Fully automated / Approve before publishing / Manual publishing; schedule changes save immediately. | Left out of Vaultio on purpose. |
| `cms-integration` + `integrations/webhook` | Custom API is now **the webhook** (old REST/field-mapping/basic-auth text removed). Payload: `id, keywords, title, metaDescription, slug, languageCode, content_html, content_markdown, jsonLd, faqJsonLd, heroImageUrl, heroImageAlt, featureImageEnabled, createdAt`; bearer token sent as `Authorization: Bearer` **and** `x-api-key`; endpoint must return 2xx JSON (`{}` ok, ideally `{"link": ...}`). Returned link stored only if it's an article page on the site's domain/subdomain **or the webhook's domain** and it loads; otherwise filled from the sitemap later. Test sends the **first (oldest)** article. | Vaultio payload and headers match (`src/server/publishing/publish.ts:41-64`). Link-validation rule and "oldest article" test not checked. |
| `integrations/blog-hosting` | Branding: logo + **blog name**; **colour now comes from Settings → Branding** (no own colour picker). New **DNS troubleshooting guide** (CNAME, Cloudflare "DNS only", dig/whatsmydns/dnschecker). **Unverified setups are removed after 5 days.** | Not checked in Vaultio: 5-day cleanup, blog name. |
| `integrations/webflow` | Wizard now **7 steps**; new **field-mapping step** (must map at least slug + one Rich Text field); **"Use BabyLoveGrowth default styling"** toggle; one Webflow site *per website* (not per account). | Vaultio auto-picks fields (`src/server/publishing/platforms/webflow.ts:48-53`), no mapping UI, no styling toggle. |
| `integrations/ghost` | Wizard 5 steps; author = **name or email of a Ghost staff user**. | Vaultio Ghost sends no author. |
| `integrations/wordpress` | Publishes on the days set in Settings → Schedule; options "publish immediately / save as draft"; **"Connect manually instead" with an application password** (no plugin) is now documented. | Vaultio uses application passwords only (no plugin). |
| `integrations/wordpress-com` | Language not set unless WPML/Polylang; card shows "action needed" when access is revoked. | **Vaultio has no WordPress.com OAuth connection** (only the enum value `wordpress_com`). |
| `integrations/duda` | RSS `limit` up to **300**. | Vaultio RSS caps `limit` at 100 (`src/app/api/integrations/rss/route.ts:21`). |
| `integrations/api`, `duda`, `framer`, `lovable`, `nextjs-blog` | **One API key per website shared by API, Duda, Lovable, Framer and Next.js Blog**; regenerating breaks all of them. | Vaultio uses **separate** Framer and Lovable keys (STATUS.md) — a deliberate difference, fine. |
| `integrations/shopify-product-catalog`, `woocommerce-product-catalog` | **Catalog re-syncs automatically about once a day**; first sync starts on connect. | Vaultio `catalogSync` is daily ✓. |
| `other/nofollow-backlinks` | Links rechecked **about once a week** (was "every few days"). | Vaultio checks daily (`backlinkCheck`). |
| `whitelabel` | Requirements now: agency name, logo + **square favicon**, dashboard subdomain, **email sending domain**, primary + **accent** colours. Grow also "$59/month billed yearly". **WordPress plugin for white label = neutral "GrowthSEO – Content Sync" plugin in the WP directory.** **White-label dashboard includes everything except Instagram & Facebook posting.** **Referral elements never shown on white-label domains.** Set up from your own account. | Vaultio matches (favicon, sending domain, IG/FB and referrals left out). White-label WP plugin not built (STATUS.md). |

## c) Public-site checklist vs. Vaultio

Sources: `/en/pricing`, home, `/en/whitelabel`, `/en/backlinks`, `/en/ai-visibility`, `/en/rank-on-llms`, `/en/shopify`,
`/en/mcp`, `/en/backlink-marketplace`, docs FAQ.

### Plans, prices, limits

| Item (public site) | In Vaultio? |
|---|---|
| Grow $99/mo; yearly **$59/mo ("save $480")** | yes (`scripts/stripe-prices.json`: 9900 / 70800) |
| Scale $399/mo; yearly **now $239/mo ("save $1,916")** — research copy had $199/mo | **partly** — Vaultio yearly Scale is $2,388 = $199/mo (`scripts/stripe-prices.json:11`, also STATUS.md "Needed from the owner"); site now implies $2,872/yr |
| 3-day free trial | yes (Stripe trial) |
| 90-day money-back guarantee (eligibility terms) | no (no guarantee terms/page; owner decision) |
| Grow: 30 articles/month, 1 language | yes (one article per schedule day, every day by default, 30-day plan horizon — `strategy.ts:432`) |
| Scale: 120 articles/month in up to 4 languages with local keyword research | partly — 3 extra language sites included on Scale (`src/lib/billing.ts:21`), each with own keywords/plan; STATUS.md says Scale is only advertised with 50 prompts + priority support |
| AI prompts tracked: 10 Grow / 50 Scale, "tracked daily" (pricing) vs "tracked every week" (`/en/ai-visibility`) | yes for limits (`src/lib/billing.ts:20-21`); Vaultio checks **weekly** (Monday, `schedule.ts`) |
| Prompt add-ons +30 $49/mo, +50 $89/mo | yes |
| Models tracked: "ChatGPT, Claude & Gemini" (pricing); docs now say ChatGPT + Claude; marketing also says Perplexity | partly — Claude, ChatGPT, Gemini; **no Perplexity** |
| Backlinks "worth $800+/mo" Grow, "$1,600+/mo" + higher-DR placements Scale | partly — exchange built; no Scale-only higher-DR tier |
| Instagram & Facebook carousels: weekly (Grow) / daily (Scale) | no (left out on purpose for white label) |
| Reddit & Quora agents | yes (drafts only, by design) |
| Google Business Profile optimization ("Soon") | no (also "soon" upstream) |
| Technical site audit / GEO audit | yes |
| Dedicated 1-on-1 SEO/GEO specialist (Scale only) | no (left out on purpose) |
| Seats: 1 (Grow) / unlimited (Scale) | no — no seat limits (STATUS.md) |
| Support: email (Grow) / priority same-day (Scale) | partly — "Talk with team" booking/support settings; no tiering |
| Volume discounts 2–4 10%, 5–8 12%, 9–14 15%, 15+ 20% (applied to each *new* site's plan from the 3rd site) | no (STATUS.md "Billing items not built yet") |
| White label: free setup, $99/site/month, dedicated account manager, branded PDF reporting | partly — white label + PDF reports built; pricing/account-manager are business decisions |
| Referral: prepaid Visa card per paying friend | no (left out on purpose) |
| Publisher marketplace (see below) | no |

### Content features

| Item | In Vaultio? |
|---|---|
| Keyword research & SERP clustering | yes (DataForSEO, `strategy.ts`) |
| 30-day content strategy from ranking & citation trends | yes (30-day plan); "citation trends" input: no |
| Branded articles (voice, products, brand colours) | yes |
| High-quality images & infographics, "included" | yes (OpenAI/Gemini images, infographic per article) |
| Images stripped of metadata incl. C2PA | partly — every image is re-encoded to WebP with `sharp` without `withMetadata()` (`src/server/media.ts:29-32`), which drops EXIF/C2PA, but this isn't stated or tested |
| Internal links, FAQ, JSON-LD schema in every article | yes (3–6 internal links vs. "up to 10" upstream) |
| "Recommended article" section at the end | no |
| Article quality score 0–100 with criteria breakdown | partly — pass/fail quality checks (`writer.ts:101-114`); check if a 0–100 score is shown |
| Quality criteria shown on home: answer-first, credible source, optimal structure, cited sources, internal/external links, statistics, **plagiarism check**, image alt texts, semantic keywords, meta tags, JSON-LD, word count | partly — no plagiarism check; others present in `qualityChecks` |
| 50+ languages (home/pricing), 32 (docs FAQ) | yes (36 content languages) |
| People Also Ask data in articles (`/en/rank-on-llms`) | partly — FAQ is "questions people also ask" generated by Claude; no PAA data source (1 file mentions it) |
| Edit article with AI (`/en/rank-on-llms`) | no (instructions per topic and improvements exist; no in-editor AI edit) |
| Multi-user access | yes (Team) |
| Article improvements (rewrite best-chance article, ≤2 days/week, GSC) | yes |
| Product-aware articles: catalog sync, product links, **packshots turned into editorial visuals** | partly — no product photos in generated images (STATUS.md follow-ups) |

### Publishing / integrations

| Item | In Vaultio? |
|---|---|
| WordPress (official plugin, or application password) | partly — application password only, no plugin |
| WordPress.com (one-click OAuth, no plugin) | no |
| Shopify, Webflow, Wix, Ghost, BigCommerce, GoHighLevel | yes (Wix without cover image; Webflow without field-mapping step/styling toggle; Ghost without author) |
| Framer plugin, Lovable prompt, Duda RSS, Next.js blog (npm package), Snapps | partly — Framer/Lovable/Duda yes; **Next.js Blog npm package and Snapps: no** |
| Blog hosting on a subdomain (1 DNS record) | yes |
| Base44 / Bolt / Replit / v0 (via blog hosting) | yes (they are just blog hosting) |
| Webhook / REST API | yes |
| Scheduled publishing (drip or batch) | partly — schedule weekdays; no batch mode found |
| Shopify / WooCommerce product catalog, feeds | yes |
| Google Analytics (AI traffic attribution), Search Console | yes |
| Visibility & citation dashboard | yes |
| Monthly reporting with a human specialist (Scale) | partly — automated monthly report email + PDF; no human |
| Weekly progress email per website (docs settings) | no (monthly only) |
| **MCP server for Claude** (`/en/mcp`): read-only GSC + GA4 tools (quick wins pos. 5–15, top queries/pages, cannibalization, decaying pages, country breakdown, GA4 channels, AI-search referrals, landing pages, health score/CWV, llms.txt/robots/sitemap, on-page issues, prioritized fix list) + a free "AI search strategy" report (visibility for one buyer question, 30-day plan, homepage issues, first article with cover image, PDF; one per website, no account needed) | no |
| **Publisher marketplace** (`/en/backlink-marketplace`): non-customers with DR 30+, 300+ monthly non-branded clicks, GSC connected with 3+ months of history, own-domain blog on WordPress/Webflow/Shopify/Wix/webhook get free articles with 1–2 outbound links to subscribers, paid **$1 per DR point per article** monthly via Stripe, max 30 articles/month, approve-or-auto-publish, publish days, monthly cap | no |
| Free GEO audit (ChatGPT, Claude, Perplexity, Gemini) and ~20 free SEO tools | partly — public share page for Site health; no public free tools |

### AI visibility page features (`/en/ai-visibility`)

| Item | In Vaultio? |
|---|---|
| Visibility score, competitors found automatically, sentiment, answer sources | yes (`visibility.ts`, `llmAnswers.sources/brands/sentiment`) |
| Buying intent per prompt (awareness / research / evaluation / buying) | yes (`PromptIntent`, `src/db/schema/growth.ts:128`) |
| Turns gaps into content, backlinks and Reddit/Quora work | partly — content plan uses prompts; no explicit gap→action link checked |

## d) How their agents produce results (public numbers) vs. Vaultio

| Topic | What the public site says | Vaultio | Match? |
|---|---|---|---|
| Volume / schedule | 30 articles/month Grow ("publish SEO-optimized articles daily"); Scale 120/month in 4 languages; schedule = days new articles are generated | One article per schedule day, every day by default (`articleScheduleWeekdays` empty = every day), 30-day plan horizon (`strategy.ts:432`); Scale 3 extra language sites | yes |
| Article length | Example article on home: **2,247 words, 6-min read** | Default target 2,000 words, configurable 800–5,000 (`src/db/schema/organization.ts:225`, `src/server/actions/settings.ts:99`) | roughly |
| Images per article | Example: **3 images** (cover + 2) + infographics | Cover + up to 2 body images (`src/server/articles/visuals.ts:14`) + 1 infographic | yes |
| Internal links | Example **10**; FAQ "up to 10" + "recommended article" section | Prompt asks for 3–6 (`writer.ts:54`); quality check ≥2; no recommended section | **no** — fewer links, no recommended section |
| External links | Example **24** external links ("cited sources") | Only research sources, quality check ≥2 (`writer.ts:108`); sources section optional | likely fewer |
| Keywords per article | Example: 3 keywords + semantic keywords | Cluster keywords + 8–12 semantic keywords (`writer.ts:193`) | yes |
| Article structure | TL;DR bullets, table of contents, numbered steps, "Perspective" section, "Where <brand> fits" section, FAQ, Sources, Recommended list | TL;DR / Key takeaways, promo paragraph before FAQ, FAQ, Sources (`writer.ts:47-61, 264`); no ToC, no recommended list | partly |
| Article types | 4: explainer, how-to, educational listicle, product listicle (roundup/comparison), matched to search intent | 7 types (`writer.ts:29-37`) | yes (superset) |
| Writing process | "Fully automatic AI writing based on deep research and fact-based sources", SERP-based outline from top-ranking content; semantic NLP keywords from top results | Research step with sources, then write (`writer.ts:150-180`); outline from SERP top results not verified | partly |
| AI visibility measurement | Prompts checked **daily** (pricing) / **weekly** (AI-visibility page); models ChatGPT + Claude (docs) or + Gemini (pricing); score = share of tracked questions where AI names the brand; brands, sources, sentiment | Weekly (Monday), Claude + ChatGPT + Gemini when keyed, brand/source/sentiment extraction (`visibility.ts`) | yes (cadence matches the AI-visibility page, not the pricing page) |
| Backlinks: mechanics | Exchange of 5,000+ sites; links placed inside new articles of other customers (each publishes 30/month); same-industry; only a third of applicant sites accepted; adult/illegal/gray-hat/PBN rejected | Exchange inside one Vaultio installation; links placed by the writer, max 2 per article (`exchange.ts:27`), partner DR ≥ own − 25 | partly (network size is inherent) |
| Backlinks: credits | Start 100; earn = DR, **max 20 (10 on platform subdomains)**; spend on receiving; negative balance pauses incoming links; credits move once live | Start 100, earn = DR **max 25**, no platform-subdomain cap; same negative-balance rule; credits only for live dofollow (`exchange.ts:4-6, 24-31`) | **partly** |
| Backlinks: timing | First links **3–7 days after the plan is paid; none during trial** | Agents (incl. placement) run while `trialing` | **no** |
| Backlinks: nofollow recheck | About once a week | Daily `backlinkCheck` | stricter (fine) |
| Domain rating | "Powered by Ahrefs" | DataForSEO domain rating, monthly (`schedule.ts`) | different source |
| Site health | Weekly; score = speed 20% + LLM 40% + technical 40%; titles 45–60, descriptions 150–160; H1, content-gap, llms.txt presence | Weekly; score = 40/30/30 without speed; titles 30–60, descriptions 120–160; H1, llms.txt; no content gaps | **partly** |
| Improvements / refresh | Rewrite "the article with the clearest chance to rank better" on up to 2 days/week, needs GSC | Same rule (`settings.ts:226`, `ARCHITECTURE.md:76`) | yes |
| Product catalog | Re-sync about once a day; packshots into editorial visuals | Daily sync; no packshot visuals | partly |
| Reddit/Quora | Manual posting now (autopilot no longer in docs); sources: keyword, Google ranking for keyword, trending topic in subreddit | Manual; keyword + Google `site:` search | mostly |
| Instagram/Facebook | Every article → educational carousel; weekly (Grow) / daily (Scale) | Not built (by design) | n/a |
| Results timeline (FAQ) | Indexed in days–4 weeks; movement weeks 4–8; meaningful 4–6 months (up to 12) | — (copy only) | n/a |

## Suggested follow-ups (largest gaps first)

1. Backlinks: cap earnings at 20 (10 for `*.myshopify.com`-style platform hosts), no placement for trial sites, niche categories (CBD/adult/gambling same-category only; crypto/pharma excluded).
2. Site health score weights (20/40/40 incl. page speed), title 45–60 / description 150–160 rules, content-gap check.
3. Writer: up to 10 internal links and a "recommended articles" block; more cited sources.
4. Scale yearly price ($239/mo now) — owner decision.
5. Duda RSS `limit` up to 300; Ghost author; Webflow field mapping + default styling toggle; WordPress.com OAuth.
6. Weekly progress email; Overview "Get started" checklist and success-story card.
7. New upstream products not in Vaultio: MCP server for Claude, publisher marketplace, Perplexity tracking.
