# Vaultio platform architecture

Vaultio is an AI SEO/GEO agent platform: agencies and businesses add a website, and
background agents research topics, write and publish articles, earn backlinks, audit the
site, and track visibility in Google and AI assistants. The dashboard shows what the agents
did each day.

The reference product was documented read-only from the owner's account; that research is on
the `research` branch (`research/README.md` is the entry point: page specs, API map, data
model, design tokens, screenshots and docs).

## Stack

| Layer | Choice |
|---|---|
| Web app | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Radix primitives, lucide icons, Recharts |
| i18n | next-intl, locale-prefixed routes (`/en`, `/fr`, `/nl`, `/de`, `/es`, `/pt`, `/it`); English catalog in `src/messages/en.json`, other locales fall back to it |
| Auth | Better Auth (email + password, Google sign-in when `GOOGLE_CLIENT_ID/SECRET` are set), sessions in Postgres |
| Database | Postgres via Drizzle ORM (`src/db/schema/*`, migrations in `drizzle/`) |
| Background work | pg-boss queues on the same Postgres, run by `npm run worker` |
| White label | `whitelabel_configs` row per agency; the request host picks brand name, logo, favicon and accent color |

## Folders

```
src/app/[locale]/(auth)        sign-in, sign-up
src/app/[locale]/(app)/dashboard   site mode (one client site selected via the org_website_id cookie)
src/app/[locale]/(app)/clients     agency mode (all clients, invoices, agency settings)
src/app/[locale]/(app)/onboarding  add a website / client
src/components/shell           header, website selector, sidebar, mobile menu
src/components/overview        Overview page cards
src/server/context.ts          session, workspace, visible sites, selected site, brand
src/server/queries/*           read models for pages
src/server/actions/*           server actions (mutations)
src/server/agents/*            the agent engine (see below)
src/worker/index.ts            worker process entry point
```

## Agent engine

Everything the agents do goes through one path, so work is never silently dropped:

1. **Adding a client** (`addSite` action) creates the `org_websites` row and enqueues the
   `onboarding` job.
2. **Onboarding** (`orchestrator.runOnboarding`) runs each step in `ONBOARDING_STEPS` once:
   analyze website → sitemap sync → site health audit → find competitors → keyword research →
   AI prompts → first-month content plan → join backlink exchange, then computes milestones.
3. **Scheduler** (`orchestrator.schedulerTick`, every 15 minutes) enqueues every agent due today
   for every onboarded site, from `AGENT_SCHEDULE` in `schedule.ts`. It also re-enqueues
   onboarding steps that were skipped or failed once their requirement becomes available,
   so connecting an API key or a Google account catches the site up automatically.
4. **Runner** (`runner.runAgentJob`) executes one job for one site and day at most once
   (`agent_job_runs` has a unique key on site + job + day). If a requirement is missing it
   records `skipped` with the reason (shown to the user during setup); errors are recorded as
   `failed` and retried by pg-boss.
5. **Activity log**: each successful job writes `agent_activities` rows. The Overview feed and
   the "Planned actions" popover (built from the same `AGENT_SCHEDULE`) read from these.

### Schedule (matches the reference product's "Planned actions")

| Agent | Cadence | Needs |
|---|---|---|
| Sitemap sync | daily | — |
| Traffic check / AI traffic report | daily | Google Analytics connected |
| Google rankings check | every 3 days | Search Console connected |
| AI visibility check | weekly (Mon) | LLM provider keys |
| Site health audit | weekly (Tue) | — |
| Competitor content-gap scan | weekly (Thu) | keyword data + LLM |
| Domain rating check | monthly (1st) | authority data provider |
| Topic research + cannibalization check | daily | LLM |
| Article writing + publishing | on content-plan days | LLM, image source, publishing integration |
| Milestones (achievements) | daily | — |
| Monthly client report email | monthly (1st) | email sending (Resend) + "Monthly email" on |
| Backlink check (exchange links in this site's articles are live) | daily | — |
| Improvement scan | daily (when improvements are on) | Search Console connected |
| Article improvement | day before each improvement day (max 2/week); auto-publish on the day if on | Search Console + LLM |

### Agent status

| Agent | Status |
|---|---|
| Website analysis (brand name, description, logo, platform, theme color) | built, no keys needed |
| Brand profile (positioning, audience, offers with prices, brand voice, seed topics, country) | built (Claude) |
| Sitemap sync | built |
| Site health audit (≤20 pages, 15 page checks, robots/sitemap/llms.txt, AI-crawler blocking, scores) | built |
| Competitors (DataForSEO competitor domains, falls back to who ranks for the seed topics) | built |
| Keyword research (DataForSEO keyword ideas, filtered and grouped into topic clusters, skipping keywords the site already ranks for) | built |
| AI prompts customers ask (10 per site) | built (Claude) |
| First-month content plan + daily top-up to ~30 days ahead | built (Claude picks from clusters with a reason per topic) |
| Topic research (tomorrow's topic: duplicate-content check against the sitemap, SERP snapshot) | built |
| Article writer (Claude web research with real sources → article in the brand voice → meta, FAQ, JSON-LD, quality checks) | built |
| Competitor content-gap scan, domain rating | built (DataForSEO) |
| Milestones engine | built |
| Publishing: content API (`/api/integrations/v1/articles`, `X-API-Key`), signed webhook, WordPress (application password); auto-publish after writing and "Publish now" | built |
| Other platforms: Shopify, Webflow, Wix, Ghost, BigCommerce, GoHighLevel, hosted blog; Framer (plugin), Lovable (prompt) and Duda (RSS feed) pull published articles | built |
| Article images (cover in one of 6 styles, up to 2 body images), CTA cards (link, map, contact), promo paragraph, YouTube video | built |
| Article improvements: opportunity scan, section-level rewrites with safety checks, per-change review, publish/update, impact | built (Vaultio articles) |
| Backlink exchange: join with 100 credits, contextual placement by the writer, daily live/nofollow check, credits ledger, Backlinks page | built |
| AI visibility: weekly + at onboarding, asks each prompt to Claude (web search), ChatGPT and Gemini when keyed; mentions, brands with sentiment, cited sources; Overview / Prompts / Brands / Sources pages | built |
| Client reports: Reporting page with section switches and live preview, print-to-PDF, monthly email with a stored snapshot behind a share link (`/api/reports/shared/<token>`) | built |
| Google Analytics + Search Console: per-site connection, daily GA4 sync (channels, pages, AI assistants), Search Console sync every 3 days, Site traffic pages | built |
| Backlink exchange matcher, Reddit / Quora agents, Instagram & Facebook posting | later phases |

The AI and keyword-data clients (`src/server/ai/claude.ts`, `src/server/seo/dataforseo.ts`) are
swappable. `npx tsx scripts/test-agents.ts <siteId>` runs onboarding, topic research and the
writer with stand-in providers to check the whole pipeline without API keys.

Claude calls use `claude-opus-5-5` (override with `CLAUDE_MODEL`), structured outputs for JSON,
streaming for long articles, Anthropic-hosted web search for research, prompt caching on the
stable system prompts, and server-side refusal fallbacks (`fallbacks: "default"`).

### Google Analytics and Search Console

Each site connects GA4 and Search Console separately (Settings → Analytics), like the reference
product: `/api/integrations/google/start` sends an admin to Google's consent screen with a signed
state, `/api/integrations/google/callback` stores the refresh token encrypted on the site's `ga4` or
`gsc` integration, then the admin picks the property. Choosing a property starts the sync agents at
once; disconnecting revokes the token but keeps the property and the synced numbers, so reconnecting
resumes without downloading history again. All Google calls are in `src/server/google/client.ts`.

The agents copy Google's numbers into Vaultio's tables so pages never wait on Google:

| Agent | Stores |
|---|---|
| `analyticsSync` (daily) | `ga4_channel_daily` (visitors per channel per day, AI assistants split out of Referral) and `ga4_range_metrics` totals, channels and pages for each period the pages offer |
| `aiTrafficReport` (daily) | `ga4_ai_source_daily` (visitors per AI assistant, day and landing page) and the AI rows of `ga4_range_metrics` |
| `rankingsCheck` (every 3 days) | `gsc_daily_metrics` and `gsc_dimension_metrics` (one row per day and page, search or country) |

Unique visitors can't be added up across days, so GA4 periods are fetched whole; Search Console
numbers add up, so its periods are summed from daily rows (positions weighted by impressions). The
first run backfills history (GA4 from the property's creation, at most 5 years; Search Console about
16 months); later runs re-fetch the last few days, which Google may still revise. A period is the last
N days including today (`src/lib/traffic.ts`); Search Console periods end on its latest day of data.

### Onboarding wizard

Adding a website creates it with `onboardingStatus = "not_started"`; `/onboarding/[step]` walks
through market, business, competitors, brand, Search Console, survey and plan
(`src/server/onboarding/wizard.ts`, `src/server/actions/onboarding.ts`). Each step stores its answer
and `lastCompletedOnboardingStep = "wizard:<step>"`; steps that don't apply are skipped (no Google
app keys, survey already answered or an agency adding a client, no billing or already on a plan).
The dashboard sends a website still in the wizard back to it. The last step starts the onboarding
agents (`beginOnboarding`); with billing on, that happens when Stripe Checkout returns to
`/onboarding/plan?checkout=…`. `onboardingAnswers` tells the agents what the owner confirmed: the
brand profile keeps the description and audiences, competitor discovery keeps the chosen
competitors, a "Global" market adds no target country. The example article (also in Settings →
Branding) sets the brand voice.

The agency setup (`/onboarding/agency/[step]`, `organizations.agencySetupStep`) reuses the
white-label branding and domain forms and the team invitation; `agencyMode` records white label or
branded reports only.

### Site health audit

`src/server/site-health/`: `checks.ts` holds the checks as pure functions over parsed pages (tested
in `scripts/test-site-health.ts`), `probe.ts` checks each link and image once per audit (HEAD, or a
one-byte GET; 404/410/5xx and unknown domains count as broken, 401/403/429 don't, since sites block
bots), `pagespeed.ts` calls PageSpeed Insights (mobile; keyless at low volume, `PAGESPEED_API_KEY`
raises the quota) for the homepage and the next four pages, `audit.ts` runs the weekly audit and
`validateIssue` ("Validate fix"), which re-checks one issue on the live site, marks it fixed and
recalculates the page and audit scores. The page speed tile is the PageSpeed average when it ran,
otherwise the server response time.

### Weekly progress email and notifications

`weeklyProgress` (Mondays, needs email) sends each member who can see the website a summary built
from real data only (`src/server/reports/weekly.ts`): articles published in the last seven days, new
live backlinks, Google clicks against the week before, AI answers that mention the site, the latest
site health score and the topics planned next. People turn it off per website in Settings → Account
→ Notifications (`email_preferences`; no row means on).

Target location (Settings → Business): one country or Global, optionally narrowed to a region or
city from DataForSEO's location list; `siteMarket` uses the region's location code for keyword data.

### Writing rules and the plagiarism check

Settings → Writing / Visuals rules are stored as text (`articleInstructions`, `imageInstructions`, one
rule per line, which the writer and image prompts read) plus `instructionMeta` (where each rule came
from, the last 20 changes, requests that can't be done). `src/server/instructions.ts` sends each new
request to Claude with the current rules: it returns rules to add (and rules for the other list),
rules it replaces, settings to switch (only from a fixed list of keys and values), requests the
agents can't do and a short explanation. Article feedback and regeneration requests go through the
same review after the response (`after()`), keeping only what applies to future articles. Without
the Claude key the text is kept as written and marked "Review pending".

The writer compares its draft with the research sources and the pages ranking for the keyword
(`src/server/articles/originality.ts`): 8-word runs found on a page count as matching text. Over 6 %
on one page, or a paragraph that's mostly matching text, fails the check; those paragraphs are
rewritten once and checked again. The result is the "Plagiarism check" quality item; it is left out
when no page could be read, and kept as it was after edits in the editor.

### Article images and CTA cards

After the text is written, the writer asks Claude for an image plan (a concrete scene for the cover
and for up to two sections, with alt texts) and builds each image prompt from Settings → Visuals:
the cover or body style, the brand colours, the image mood and the image rules. Images come from
OpenAI's image model or Gemini (`src/server/ai/images.ts`), are converted to WebP with sharp and stored
in Postgres (`media_assets`), served publicly at `/media/<random id>.webp`. CTA cards are worded per
article by Claude and placed as marked markdown blocks (readable as plain markdown);
`renderArticleHtml` turns them into cards with inline styles in the client's brand colour. A YouTube
video is found with Claude's web search (optionally only from the client's channel). Any failure in
this step is recorded on the article and never stops it from being written.

Publishing to WordPress copies the images into the site's media library (the cover becomes the
featured image) and remembers the post and uploads, so a regenerated cover updates the same post.
Images live in Postgres to avoid running separate file storage; move them to object storage
(S3, R2, Supabase) if volume grows.

### Infographics

When "Add an infographic" is on in Settings → Visuals (on by default), the writer adds one infographic
per article after the images (`src/server/infographics/`). Claude reads the article's sections
(not the FAQ, sources or conclusion) and either picks the one best shown visually or answers that
none is. It returns a spec in one of five layouts: bars, steps, checklist, comparison or 2–4 key
figures. `checkSpec` drops the spec if any number on it isn't written in that section, or if a bar's
length doesn't match the number it's labelled with, so an infographic never shows figures the article
doesn't. Vaultio typesets the spec itself (satori → SVG → PNG with sharp, bundled Inter and Source
Serif fonts) in the client's brand colour with its logo, name and domain, in the style chosen in
Settings: Editorial (warm paper, serif title, a small topic illustration from the image provider when
one is configured) or Classic (the cover image as a header band). Because Vaultio draws the text, the
lettering is always correct, unlike text drawn by an image model. The image is stored as a 1600px-wide
WebP in `media_assets` (kind `infographic`), placed at the end of the chosen section, and gets an alt
text listing its data. Fonts for scripts beyond Latin, Cyrillic, Greek and Vietnamese are fetched per
image (see Languages); right-to-left languages get no infographic yet.

### Article improvements

`improvementScan` (daily) reads each published Vaultio article's Search Console numbers and keeps a
live list of candidates. A page qualifies after 90 days in Google with at least 100 impressions in
90 days; pages improved in the last 6 months or rejected in the last 4 weeks are skipped, and pages
already performing well (top 3 with a normal click-through rate and steady clicks) are left alone.
The opportunity, in priority order: declining clicks (−30% on the previous 4 weeks), almost page one
(position 8–20), low click-through for the position, thin content (< 800 words), outdated (> 1 year).

`improveArticle` runs daily: the day before an improvement day it takes the candidate with the most
impressions and asks Claude for section-level edits guided by the opportunity, the page's real
searches (fetched live from Search Console) and fresh research. Dead links (404/410/missing domain,
only when DNS works) and links to competitors are proposed for removal. Safety checks flag
placeholders, links or images dropped from rewritten sections, duplicate FAQ sections, searches the
new title no longer covers, and repeated paragraphs (`src/server/improvements`). Each change is
approved or rejected on the review page; publishing applies only approved changes to the stored
original and updates the live article through `publishArticle(..., { update: true })`. With
auto-approve on, the improvement is published on its day unless it was flagged. Impact is measured
from the page's Search Console rows 14 days before and after publishing.

Existing WordPress posts (not written by Vaultio) are improved too when the site's WordPress is
connected under Publishing (`src/server/improvements/wordpress/`). The scan lists the site's
published posts through the REST API, matches them to Search Console pages (same host and path)
and leaves out Vaultio's own posts. When an improvement is prepared, the post is read fresh in its
stored form (`context=edit`) and cut into top-level pieces: plain paragraphs, plain lists and plain
sub-headings become markdown Claude can rewrite; everything else (images, galleries, embeds, tables,
FAQ, table-of-contents and other plugin blocks, styled or anchored blocks, shortcodes, the "more"
marker) becomes a `[[KEEP-n]]` token, explained to Claude in a legend and shown on the review page as
"[Image stays here]" and so on. Classic-editor posts are cut the same way (paragraphs at blank
lines). Publishing applies the approved changes to the content as it was when the improvement was
prepared: sections without an approved rewrite are copied byte for byte, a rewritten section keeps
its elements (any Claude left out go at its end and are flagged), new blocks are written the way
the site's WordPress already writes them, and rewritten links keep their original attributes
(`rel="nofollow"`, `target`). Before updating, the post is read again: if it was edited in
WordPress since, nothing is changed and the improvement is prepared again later. WordPress keeps
the previous version in the post's revisions. Extra checks for these posts flag elements left out of
a rewrite, the post's own inline styling lost in a rewrite, markdown that wouldn't turn into
formatting, and a second FAQ next to an FAQ block.

The title and meta description are only changed when that changes what search engines see: the
live page's title has to contain the post title (a title template), and its meta description has to
come from the post excerpt. A custom SEO title or description set in Yoast, Rank Math and similar
plugins can't be written through WordPress's API, so those stay as they are and the review page
says so. Posts built with a page builder (Elementor, Divi, WPBakery, Beaver Builder, Bricks, Avada,
Oxygen, Cornerstone, Enfold) keep their own copy of the page and are skipped. Other platforms'
existing posts (Shopify, Webflow, Wix, Ghost) aren't improved yet.

### Backlink exchange

The network is every site on this installation with the exchange on (`src/server/backlinks`).
Joining (an onboarding step, or switching the exchange on) adds 100 credits to
`backlink_credit_ledger`. A site receives links from sites whose domain rating is at least its own
minus 25 (or its minimum giver rating); a site whose balance is not positive receives none. When an
article is written, partner pages from up to 15 eligible sites are offered to Claude, which may add
at most two links by rewriting one sentence each; an edit is kept only if the sentence exists, carries
exactly that link and reads the same without it. Repeats to the same site within 30 days and links
back to a site that linked here in the last 90 days are avoided. Sites still on a free trial receive
no links. Each site has an exchange category from the brand analysis (`org_websites.exchange_category`):
CBD, adult and gambling sites exchange only within their category; illegal drugs, pharma/supplements
and crypto ("excluded") don't take part, and the Backlinks page says so.

`backlinkCheck` (daily, per giving site) fetches each published article and finds each link:
a live dofollow link earns the giver its domain rating (max 20, or 10 for a giver on a platform
address such as *.myshopify.com) and costs the receiver the giver's
rating; a nofollow or missing link earns nothing, and a credited link that turns nofollow or
disappears is reversed. Receivers see "Agent got you a backlink" the first time a link goes live.
Buying credits needs billing and isn't built.

Exchanging links is a link scheme in Google's spam policies when done for ranking; keeping links
few, contextual and relevant (as here) reduces but doesn't remove that risk.

### Reddit and Quora

`redditSearch` and `quoraSearch` (`src/server/community/agent.ts`) run daily, but each monitored
keyword is searched only once a week, and soon after it is added (adding a keyword re-queues
today's run). On a platform's first run Claude suggests ~15 search phrases from the brand profile
and the AI-visibility questions; the first five are monitored (the limit is per platform, in
`community_settings.max_keywords`) and the rest are offered under "Add more". Reddit also gets
"<competitor> alternatives" suggestions, never switched on automatically.

Threads are found the way AI assistants find them: through Google. With DataForSEO the agent runs
`<keyword> site:reddit.com` (or the chosen subreddits joined with `OR`) and `site:quora.com`;
without it, Claude's web search restricted to those domains. Links are reduced to the thread
(comment permalinks and Quora answer links point back to their thread or question; profiles,
spaces and topics are dropped). If `REDDIT_CLIENT_ID/SECRET` are set, the Reddit Data API adds
votes, comments, post text and age, and archived, locked, removed or adult threads are dropped;
it also adds the threads trending in the chosen subreddits (`/r/<name>/hot`, up to five subreddits,
pinned posts skipped) on each search. Each opportunity says why it was found (`source`): "Ranks on
Google for …" (DataForSEO), "Found for …" (web search) or "Trending in r/…".

Claude rates every new thread's relevance to the business (0–100, with a one-line reason) and
threads under 60 are not shown. The opportunity score is relevance (60%) plus reach (votes and
comments, or the Google position) and freshness (20% each, when known). Replies are drafted for
the best three of each run; the rest have "Draft a reply". Reply rules: answer the question first,
mention the brand at most once and then say openly that the writer works with it, never pose as
an unaffiliated customer or invent experiences, no links. The business's own style instructions
apply on top.

Nothing is posted automatically. A person copies the reply, posts it in the thread ("Copy &
open"), and marks it replied; "Not relevant" hides a thread for good. The reference product's
Reddit autopilot (posting from a connected account) is left out on purpose: automated
promotional comments break Reddit's spam rules and get accounts banned, and Quora has no posting
API. Replied threads feed the client report's "Reddit and Quora" section.

### Team members and invitations

A workspace (`organizations`) has members with a role: admins see every website and manage
settings, members only see the websites they were given (`member_website_access`). Invitations
(`organization_invitations`) carry the role and websites, last 7 days, and link to
`/<locale>/invite/<token>` on the domain the admin used (so agency domains work); they are emailed
through Resend when it's configured, otherwise the admin copies the link. Signing up creates an
empty workspace; accepting an invitation removes it and joins the inviting one. An account that
already runs a workspace with websites or other members can't join a second one (the app has one
workspace per account).

### Publishing platforms and the hosted blog

`publishArticle` sends an article through every connected integration and remembers each
platform's post id in `articles.deliveries`, so republishing (improvements, cover changes) updates
the same post. Credentials are verified with the platform before they are stored (encrypted), and
each platform can publish immediately or save drafts (`src/server/publishing/platforms/`):

| Platform | Connection | Article |
|---|---|---|
| WordPress | site URL, username, application password | REST post, images copied to the media library |
| Ghost | site URL, Admin API key (short-lived HS256 token) | Admin API post from HTML, cover image, FAQ schema in the head |
| Webflow | API token → site → CMS collection → "Map your collection fields" (each field gets an article part allowed for its type: Rich Text → body; Plain Text → summary, SEO title, meta description, cover alt text, author, target keyword; Image → cover; Date → publish date; a body field and every required field must be mapped; suggestions by field name) | collection item from the mapping (older connections use the automatic body/summary/cover map) |
| Shopify | store + Dev Dashboard app Client ID/secret (client-credentials token) or an Admin API token | GraphQL `articleCreate` / `articleUpdate` on the chosen blog |
| Wix | Site ID + account API key (author = a site member) | draft post from Ricos JSON converted from the markdown, then published |
| BigCommerce | store hash + store-level API account token (Content: Modify); optional WebDAV login | REST v2 blog post at `/blog/<slug>/` ("-2"… when taken; an update keeps the address); with WebDAV the cover is copied to `product_images/uploaded_images/` (digest auth) and used as the thumbnail, otherwise it opens the post body |
| GoHighLevel | Location ID + Private Integration token (seven blog scopes) → blog, author, categories | API v2 blog post (`rawHTML`, cover URL, free slug checked first; an update keeps slug and date). GoHighLevel doesn't return the post's address |
| Webhook / API | see above | JSON payload / pulled by the client. A `link` in the webhook's answer becomes the article address only when it is on the website's or the webhook's domain (or a subdomain) and loads. "Send test" sends the oldest article |

When every delivery was a draft (and nothing pulls the articles) the activity says the article was
sent as a draft instead of published.

Three platforms fetch the articles themselves, so an article counts as published as soon as it's
published here:

- **Content API** (`/api/integrations/v1/articles`, newest first, `?status=published` for live
  articles only, `updated_at` for incremental syncs). Keys are per source (`api_keys.source`: `api`,
  `framer`, `lovable`), each shown once and replaced independently; "last used" tells whether the
  platform is fetching. Browsers may call it only from `CONTENT_API_CORS_ORIGINS` (default: Framer's
  plugin hosts and `https://localhost:5173` for plugin development).
- **Framer**: the plugin in `integrations/framer-plugin` (a separate Vite package built with
  `framer-plugin`, excluded from the app's TypeScript and lint) manages a CMS collection: it asks
  for the key (and the API address, for agencies on their own domain), imports the published
  articles as items (title, HTML content, cover, description, dates, keyword, language, original
  address), fetches only new or changed ones, removes unpublished ones, and runs without a panel
  when the user presses Sync in Framer's CMS. Its name and default API address are build settings,
  so it can be published under an agency's brand. Settings links to it with `FRAMER_PLUGIN_URL`.
- **Lovable**: `src/lib/lovable-prompt.ts` builds the prompt the client pastes into Lovable: a
  backend function copies the published articles into the project's own database every hour
  (leased, budgeted, incremental by `updated_at`, cleaned HTML), then `/blog` pages with SEO tags,
  JSON-LD pointed at the right address, sitemap and robots. The secret's name follows the brand
  (`VAULTIO_API_KEY`).
- **Duda**: Duda can only read RSS, so the website gets a private feed
  (`/api/integrations/rss?key=…&limit=10`, full HTML in `content:encoded`, cover as enclosure). The
  key's hash is stored on the `duda` integration and the key itself encrypted, so admins can copy the
  address again; a new address turns the old one off.

The hosted blog serves a site's published articles on its own subdomain (`blog.client.com`). The
domain is set up like agency domains (Vercel or a CNAME). The proxy (`src/proxy.ts`) can't query
the database, so for hosts other than the app's own it asks `/api/hosts/<host>` (cached a minute)
and rewrites hosted-blog requests to `src/app/hosted-blog/[host]` (index, article pages with meta
tags and JSON-LD, `sitemap.xml`, `robots.txt`, `rss.xml`); those pages answer only on their own
host. The blog uses the site's logo and brand colour and shows no Vaultio branding.

These platform clients follow each vendor's documented API and were tested against a local mock
(`scripts/dev-fixtures/mock-cms.py`), not live accounts.

Next.js Blog: `integrations/next-blog` is an npm package (read client + `init` scaffold that copies
`app/blog`: list, article pages with metadata and JSON-LD, tag pages, sitemap; ISR daily). It reads the
content API with a `nextjs` key (`BLOG_API_KEY`, `BLOG_API_URL` — brand-neutral names for white label);
the API returns `tags` (target keyword and short related searches) and accepts a slug in
`/articles/:id`. WordPress.com (`platforms/wordpress-com.ts`) connects with OAuth2
(`/api/integrations/wordpress-com/start` → `/callback`, state sealed with `encryptJson`), uploads images
to the site's media library, and creates, updates (by remembered post id or existing slug) or drafts
posts through REST v1.1. `publishing/live-check.ts` runs after each sitemap sync: are the latest five
published articles answering at their address and listed in the sitemap.

### White label and agency settings

Agency settings live under `/clients/settings` (Profile, Members, Branding, Hosting, Talk with team);
Settings → White label shows Branding and Hosting together for the selected workspace. A
workspace's `whitelabel_configs` row holds its brand (name, logo, favicon, primary and accent
colours) and domains. Logos and favicons are converted to PNG (so an uploaded SVG can't carry a
script) and served from Postgres at `/brand-assets/<id>.png`.

The brand is chosen per request from the Host header (`getBrand`): on an agency's hosting domain
the sidebar, sign-in page, page title, favicon and accent colour are the agency's; everywhere else
they are Vaultio's. Invitations and monthly report emails for an agency's workspace use its name,
link to its domain once connected, and are sent from `notifications@<sending domain>` once Resend
has verified it.

Hosting domains (`src/server/whitelabel/domains.ts`): with `VERCEL_TOKEN` + `VERCEL_PROJECT_ID`
the domain is added to the Vercel project and Vercel's recommended CNAME and ownership TXT record
are shown until Vercel reports it verified and configured; otherwise the agency CNAMEs to
`CUSTOM_DOMAIN_CNAME` and only DNS is checked. Sending domains are added to Resend and its
DKIM/SPF/MX records are shown until verified. Pending domains are re-checked when the page opens
and with "Check again". These calls follow the Vercel and Resend REST APIs as documented and were
tested against a local mock (`scripts/dev-fixtures/mock-domains.py`), not the live services.

Password resets ("Forgot password?") use Better Auth's reset tokens (one hour, single use, other
sessions signed out); the email links to the domain the request came from when that is the
platform's or a registered agency domain, and otherwise to `APP_URL`.

Profile adds the dashboard language and account deletion: the account is deleted 14 days after
the request (the scheduler purges it), together with any workspace the user ran alone, whose
Stripe subscriptions are cancelled first. A workspace's only admin must hand over admin rights
before deleting an account that other members depend on.

### Billing

Stripe, per website, like the reference product: one `main` subscription (Grow or Scale, monthly
or yearly) and optional add-on subscriptions (`src/lib/billing.ts`): 30 or 50 more AI prompts,
Reddit+, Quora+ (35 more keywords, searched daily) and backlink credits (monthly credits from the
price's `credits` metadata; subscribers only receive links from DR 20+ sites). Prices are found
by lookup key, so amounts are managed in Stripe (`scripts/stripe-setup.ts` creates them from
`scripts/stripe-prices.json`).

Checkout opens Stripe Checkout (with a free trial on a website's first plan); plan changes swap
the subscription's price (upgrades are invoiced at once, downgrades credited); pause uses
`pause_collection`; cancel is at period end; the gear button and "Manage all subscriptions" open
Stripe's customer portal. `/api/stripe/webhook` (signature-checked) mirrors subscriptions and
invoices into `subscriptions` / `invoices`; the success page also syncs right away. A paid
backlink-credit invoice adds its credits once; admins who keep "Email me my invoices" on get the
invoice link by email.

`siteEntitlements(siteId)` turns this into limits: prompts tracked, Reddit/Quora keywords and
search frequency, and whether agents may run. Without an active or trialing, unpaused plan only
onboarding, milestones and the backlink check run; the Overview says the agents are paused.
Without `STRIPE_SECRET_KEY` billing is off (nothing billed, base limits). Workspaces with
`organizations.billing_exempt` (e.g. Vaultio's own) aren't billed and get Scale limits.

Volume discount (`VOLUME_TIERS`, `src/server/billing/volume.ts`): a new website's plan checkout gets
an automatic discount by how many other websites of the workspace already have an active, paid plan —
2–4: 10%, 5–8: 12%, 9–14: 15%, 15+: 20% (so the second website is full price and the discount starts
with the third). It's a Stripe coupon (`vaultio-volume-<percent>`, "forever"), created the first time
it's needed and applied with `discounts` (Checkout then takes no promotion codes). The plan cards and
the onboarding plan step show the discounted price.

Seats (`src/server/billing/seats.ts`): members plus pending invitations. Grow includes one seat; once
any website of the workspace is on Scale they're unlimited. Agencies, exempt workspaces and billing
off have no limit. Settings → Team members shows "1 of 1 seat used" and turns "Add member" off when
full; `inviteMember` checks it too.

### Languages

A website written in several languages has one org website per language: the first is the primary
(it holds the plan), each **language site** points to it (`org_websites.primary_org_website_id`).
Languages are added from the website menu (`src/server/languages.ts`): a language site starts as a copy
of the website's settings (business details, brand, writing, visuals, schedule, CTAs…) with its own
language, an optional address of its own (e.g. `/es`) and its own market — the website's country
(Spanish for US customers) or the language's main country — and gets its own onboarding: keywords,
competitors, AI prompts, content plan and articles in that language. The brand-profile step only writes
new seed topics for it (what customers in that market search for, in that language), keeping the
copied business details. Everything else is per language site and can be changed on its own; the
product catalog is shared (it belongs to the primary, `catalogOwnerId`).

36 content languages are offered (`src/lib/languages.ts`), each with a default market (DataForSEO
location); names come from `Intl.DisplayNames`, so they show in the dashboard's language. Billing: the
Scale plan includes 3 languages per website (the oldest three); others need the language add-on
(`vaultio_language_monthly`, bought on the language's Billing page; no trial). A language that isn't
covered keeps its data but its agents pause, like a website without a plan. With billing off or for an
exempt workspace, languages are free.

The free languages follow the plan (`src/server/billing/languages.ts`, run from the Stripe sync):
during a Scale **trial** they're locked (the Add languages dialog and the language's Billing page say
so; a language can be added at the regular price, or "Skip trial & unlock free languages" ends the
trial now). When the trial converts, the oldest three become free and any paid add-ons of those
languages end at once (no refund). When the website **leaves Scale**, its free languages that aren't
paid separately are marked `complimentary_paused_at` and their Billing page offers "Keep this language"
(the add-on) or going back to Scale, either of which clears the mark.

Infographics: Latin, Cyrillic, Greek and Vietnamese use the bundled fonts; for Chinese, Japanese, Korean,
Thai, Devanagari and a few other scripts the renderer fetches a font with just the characters of that
image from Google Fonts (`src/server/infographics/fonts.ts`, cached in memory; `GOOGLE_FONTS_API` can
point elsewhere). If the font can't be fetched, the infographic is skipped. Arabic and Hebrew get no
infographic yet (satori doesn't lay out right-to-left text).

Dashboard translations: `scripts/translate-messages.ts` translates `en.json` into the other interface
languages with Claude, in batches, sending only new or changed text (it remembers what each translation
was made from in `src/messages/translation-state.json`). Every translation must parse as ICU and keep the
same placeholders, select options and tags as the English; a broken one is retried once with the error,
then left in English (the app falls back to English for missing keys). `--check` validates the files
without Claude.

### Product catalog

Settings → Product catalog holds the products articles can feature (`products`, `src/server/catalog/`).
Four sources, all read-only towards the client's systems:

- **Shopify** (integration `shopify_catalog`): an app from the Shopify Dev Dashboard with
  `read_products` and `read_inventory`, connected with the store name, Client ID and secret (the same
  client-credentials grant as Shopify blog publishing, which is a separate connection). Products are read
  through the GraphQL Admin API, 100 at a time, waiting when Shopify throttles; archived products are
  left out, drafts are kept but can't be featured.
- **WooCommerce** (`woocommerce`): a REST API key with Read permission. A redirect to another host
  (www or not) is reported instead of followed, because it would drop the key. One store platform per
  website.
- **Google Shopping or Facebook feed** (`product_feed`): an RSS 2.0 or Atom feed with `g:` fields;
  variants sharing an `item_group_id` become one product with the lowest price.
- **Manual**: one by one (with an uploaded photo, stored like article images), or a file (XML, CSV or
  Excel .xlsx, read with fflate and htmlparser2; old .xls isn't supported). Re-importing updates the
  products with the same id; photos linked in a file are copied to Vaultio's storage (200 per import).

Store and feed products are kept in sync by `catalogSync` (daily, and on "Sync catalog" or right after
connecting; it runs without a plan because it only reads the client's own store). Up to 10,000 products
per source. Syncs update only products whose details changed and keep each product's "Include in
articles" choice (turned off when a product loses its URL); products gone from the store or feed are
removed. Disconnecting removes that source's products; manual products always stay.

`productMatching` proposes up to 3 products for every upcoming topic that hasn't been written or had its
products chosen by hand. Products are shortlisted by the words they share with the topic, weighted by how
rare each word is (a word in many product names or most topics, like "roof" for a roofer, counts for
nothing). With Claude, small catalogs (80 products or fewer) go whole and bigger ones as shortlists, and
Claude picks the products a reader would genuinely want, or none. Without Claude, a distinctive word of the
product's name has to be in the topic. It runs daily (a no-op when nothing changed) and right after
catalog changes; a topic is matched again when the catalog changed since or a proposed product can no
longer be featured. In the content calendar a chip shows each topic's products, and the article
instructions dialog has a product picker (search, up to 3, clear, back to the suggestion).

The writer gets the article's products in its brief and links each one once, by name, where it helps
the reader, using only the product data given. The products it actually linked are kept on the article
(`featured_products`, shown on the article page), and the first gets a product card (photo, price in the
site's language, one sentence and a button) after the paragraph that links it. Product photos in
generated images aren't used yet.

### Client reports

`src/server/reports/data.ts` gathers one site's numbers for a period (Search Console, authority,
articles, site health, Reddit and Quora replies, AI visibility, milestones) and says which sections have data;
`render.ts` turns them into a standalone A4 HTML page (text from the `report` namespace in
`en.json`, colours from the white-label brand). The same renderer serves the live preview, the
print view ("Download PDF" opens the browser's Save as PDF) and the monthly email snapshot.
Sections without data are switched off rather than shown with invented numbers.

## Accounts and keys needed in production

| Purpose | Variables |
|---|---|
| Database | `DATABASE_URL` (Supabase, Neon, RDS...) |
| Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, optional `GOOGLE_CLIENT_ID/SECRET` |
| Article writing, topic research, AI prompts | `ANTHROPIC_API_KEY` |
| Article images | `OPENAI_API_KEY` or `GEMINI_API_KEY` (optional `IMAGE_PROVIDER`, `OPENAI_IMAGE_MODEL`, `GEMINI_IMAGE_MODEL`), plus `APP_URL` reachable by client sites |
| Keyword volumes, SERPs, competitors, domain rating | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` |
| AI visibility checks | `OPENAI_API_KEY`, `GEMINI_API_KEY` (plus Anthropic) |
| Reddit thread details (optional) | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME` (Reddit Data API app; commercial use needs Reddit's approval) |
| GA4 + Search Console | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: a Google Cloud OAuth client with the Analytics Data, Analytics Admin and Search Console APIs |
| Billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (webhook endpoint `/api/stripe/webhook`), optional `BILLING_TRIAL_DAYS` |
| Invitation and invoice emails | `RESEND_API_KEY`, `EMAIL_FROM` (or `REPORT_FROM_EMAIL`) |
| Email (monthly reports; later invites) | `RESEND_API_KEY`, `REPORT_FROM_EMAIL` (verified sender), `APP_URL` for links |
| White-label custom domains | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` (optional `VERCEL_TEAM_ID`), or `CUSTOM_DOMAIN_CNAME` for other hosts |
| Agencies' email sending domains | `RESEND_API_KEY` (Resend Domains) |
| Talk with team | `SUPPORT_BOOKING_URL`, `SUPPORT_EMAIL` |

## Deployment shape

- Web: Vercel (or any Node host) running `next build && next start`.
- Worker: a long-running Node process (`npm run worker`) on Railway, Render, Fly or a VM,
  pointing at the same `DATABASE_URL`.
- Database: managed Postgres.
