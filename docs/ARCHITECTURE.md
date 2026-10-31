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
| Other platforms (Shopify, Webflow, Wix, Ghost, Framer, hosted blog...) | next phase |
| Article images (cover in one of 6 styles, up to 2 body images), CTA cards (link, map, contact), promo paragraph, YouTube video | built |
| Article improvements: opportunity scan, section-level rewrites with safety checks, per-change review, publish/update, impact | built (Vaultio articles) |
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

Only articles written by Vaultio are improved for now; existing WordPress posts need their block
markup preserved and are a later step.

### Client reports

`src/server/reports/data.ts` gathers one site's numbers for a period (Search Console, authority,
articles, site health, AI visibility, milestones) and says which sections have data;
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
| GA4 + Search Console | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: a Google Cloud OAuth client with the Analytics Data, Analytics Admin and Search Console APIs |
| Billing | Stripe keys + webhook secret |
| Email (monthly reports; later invites) | `RESEND_API_KEY`, `REPORT_FROM_EMAIL` (verified sender), `APP_URL` for links |
| White-label custom domains | Vercel API token (domain verification) |

## Deployment shape

- Web: Vercel (or any Node host) running `next build && next start`.
- Worker: a long-running Node process (`npm run worker`) on Railway, Render, Fly or a VM,
  pointing at the same `DATABASE_URL`.
- Database: managed Postgres.
