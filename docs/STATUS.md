# Vaultio build status

Updated 31 October 2026. What is built, what is left, and what the owner still has to set up.
How the system works is in [ARCHITECTURE.md](ARCHITECTURE.md); the reference-product research
(page specs, API map, screenshots) is on the `research` branch.

Ground rules that apply to everything below:

- Every new client starts empty. Nothing is imported from the old Babylovegrowth account; the
  agents do the work from the day a client is added.
- A feature without data shows its empty state. No made-up numbers anywhere.
- White label: pages the Vaultio white label hides in the reference product (SEO specialist,
  Product updates page, Instagram & Facebook, Google Business, Refer and earn) are left out on
  purpose.

## Done

### Platform

| Area | What works |
|---|---|
| Accounts | Sign up, sign in, sessions; each sign-up gets its own workspace |
| Agencies and clients | Agency workspace with many client sites, website selector, site mode and agency mode |
| White label | Brand name, logo, favicon and colour picked from the domain (`app.vaultio.co` → Vaultio) |
| App shell | Header, sidebar, mobile menu, product-updates bell (reads `product_updates`; no updates published yet) |
| Languages | English text in `src/messages/en.json`; routes for fr/nl/de/es/pt/it fall back to English |
| Background agents | Job queue, daily scheduler, onboarding that catches up when keys are added later, every run recorded |

### Pages

| Page | Route | Status |
|---|---|---|
| Sign in / Sign up | `/sign-in`, `/sign-up` | Built |
| Add a website (onboarding) | `/onboarding/website` | Built; onboarding progress shows on Overview |
| Overview | `/dashboard/overview` | Built: daily agent activity, planned actions, agents waiting for keys, achievements, what we learned (brand profile), traffic sources card |
| Blog content: calendar | `/dashboard/content-plan` | Built: change topic, instructions, delete, add keywords |
| Blog content: article | `/dashboard/articles/[id]` | Built: article with images and CTA cards, cover image panel (regenerate, up to 5 times), sources, FAQ, quality checks, publish now, export |
| Blog content: improvements | `/dashboard/content-plan/improvements` + `/[id]` | Built: opportunities with evidence, status, discard, how it works; review page with per-change approve/reject, safety flags, publish, impact |
| Site health | `/dashboard/geo-audit` + public share page | Built |
| AI visibility (overview, prompts, brands, sources, prompt detail) | `/dashboard/ai-visibility` | Built |
| Reporting | `/dashboard/reporting` | Built: sections, live preview, Download PDF, monthly email |
| Settings: Account, Business, Branding, Competitors, Saved pages, Writing, Visuals, Schedule, Improvements, Publishing, Analytics | `/dashboard/settings/*` | Built (Visuals: the infographic style is saved but infographics aren't generated yet) |
| Site traffic: All traffic, AI search traffic, Google traffic | `/dashboard/analytics/ga4`, `/ai-traffic`, `/google-traffic` | Built: KPIs, channel / AI-model / Google charts, breakdowns, countries, top pages and searches with search, "brand articles only" and paging; connect state until Google is connected |
| Clients (agency) | `/clients` | Built |
| Invoices (agency) | `/clients/invoices` | Built; empty until billing exists |
| Backlinks | `/dashboard/backlink-exchange` | **Placeholder** |
| Socials (Reddit, Quora) | `/dashboard/socials` | **Placeholder** |
| Settings: Team members, Billing, White label, Product catalog, Reddit, Quora | `/dashboard/settings/*` | **Placeholder** |
| Agency settings: Profile, Branding, Hosting, Members, Talk with team | `/clients/settings/*` | **Placeholder** |

### Agents

| Agent | Status |
|---|---|
| Website analysis, sitemap sync, site health audit, milestones | Built, no keys needed |
| Brand profile, AI prompts, content plan, topic research, article writer | Built (Claude) |
| Competitors, keyword research, competitor gap scan, domain rating | Built (DataForSEO) |
| AI visibility check (Claude, plus ChatGPT and Gemini when keyed) | Built |
| Publishing: content API, webhook, WordPress, auto-publish | Built |
| Monthly client report email | Built (Resend) |
| Article images, CTA cards, promo paragraph, YouTube video | Built (OpenAI or Gemini images; Claude for scenes, wording and the video search) |
| Google Analytics sync, AI traffic report, Google rankings check (Search Console) | Built |
| Article improvements (scan + improve) | Built for articles Vaultio wrote; existing WordPress posts later |
| Backlink exchange, Reddit / Quora, infographics | Not built |

### How it was checked

- Each built page was opened in a browser and checked for errors; the main pages also at phone width.
- The full onboarding → plan → research → write → publish pipeline ran against a local test
  website, with stand-in AI and keyword providers (`scripts/test-agents.ts`).
- Publishing was tested against local mock webhook and WordPress servers; the content API was
  tested for valid and invalid keys. The test website and mocks are in `scripts/dev-fixtures/`.
- The monthly report agent ran for real with only the email request intercepted.
- Google: the connect → consent → property → sync → pages flow, token refresh, re-syncs, disconnect and
  reconnect ran end to end against a local mock of Google's APIs (`scripts/dev-fixtures/mock-google.py`).

## Not yet tested with real keys

These are written against the providers' documentation but have not run live yet:

- Claude: brand profile, prompts, topic research and article writing (needs `ANTHROPIC_API_KEY`).
- DataForSEO: keyword ideas, competitors, SERPs, domain rating (field mapping from their docs).
- ChatGPT and Gemini answers for AI visibility.
- Resend email sending.
- WordPress publishing against a real site.
- Google: the real consent screen, Analytics Admin/Data and Search Console APIs (response shapes from Google's docs).
- Image generation with OpenAI (`gpt-image-1`) and Gemini (`gemini-2.5-flash-image`); the request shapes could not be
  checked against current docs from this workspace, so the model names are configurable.
- The promo paragraph and the YouTube video search (they need real Claude answers).
- Uploading images to a real WordPress media library.
- Improvement rewrites with real Claude, and the live Search Console page-query lookup.

The first live run on the Mac should be watched; fixes are expected to be small (field names,
limits).

## Still to build, in recommended order

1. **Backlinks**: backlink exchange matcher between client sites, Backlinks page, credits.
2. **Socials**: Reddit and Quora agents, Socials page, their settings (also fills the report's
   community section).
3. **Team and billing**: Team members (invites), Billing with Stripe, invoices, White label settings.
4. **Agency settings**: profile, branding, custom domain hosting, members, talk with team.
5. **More publishing platforms**: Shopify, Webflow, Wix, Ghost, Framer, hosted blog.
6. **Infographics**: one chart-style image per article in the Editorial or Classic style.
7. **Improvements for existing WordPress posts** (not written by Vaultio), keeping their block markup.
8. **Product catalog** settings.
9. **Translations** for the other languages.
10. **Production launch**: hosting for the web app and the worker, managed Postgres, then point
    `app.vaultio.co` at Vaultio instead of the Babylovegrowth white label.

Smaller follow-ups:

- Use the Vaultio dragon logo in place of the "V" mark.
- Some timestamps (e.g. "API key last used") are formatted in the server's or browser's time zone;
  format them in the site's time zone to avoid mismatches in production.

## Needed from the owner

| Item | Why | Status |
|---|---|---|
| Anthropic and DataForSEO keys in the Mac `.env` | Agents that write and research | **Not saved**: the hidden key pop-ups ran at 07:44 UTC but all three came back empty (skipped or timed out). Needs to be redone with someone at the Mac |
| Google Cloud OAuth client (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) | Google Analytics + Search Console (built, waiting for this) | Not started; steps were sent in chat. Redirect URIs: `/api/integrations/google/callback` and `/api/auth/callback/google` on each app address |
| Resend account + verified sender (`RESEND_API_KEY`, `REPORT_FROM_EMAIL`) | Monthly report emails | Not started |
| OpenAI or Gemini key | Article images (and ChatGPT / Gemini in AI visibility) | Not started; without one, articles have no images |
| Vaultio logo files | Replace the placeholder "V" mark | Received (dragon mark, `research/assets/vaultio_favicon.png` on the `research` branch); not yet used in the app |
| Stripe account | Billing | Later |
| Hosting accounts (web, worker, Postgres) | Production launch | Later |
| Leftover Blog Hosting setup for `blog.vaultio.co` in the live Babylovegrowth account | Created during research; decide whether to remove it | Waiting for a decision |

## Work log

All times 31 October 2026 (UTC). Each code commit message on `main` describes its change in detail.

| Step | Where it is |
|---|---|
| Read-only research of the reference dashboard on the owner's Mac (Safari): every page, dialog, setting, API endpoint, data model, design tokens, screenshots, public docs | `research` branch, `research/README.md` |
| Vaultio logo and site logos saved from the research session | `research` branch, `research/assets/` |
| Foundation: Next.js app, design system, database, accounts, agencies and clients, white label, app shell, Overview, Clients, Invoices, agent engine and key-free agents | `main` af8b646 |
| Strategy agents (brand profile, competitors, keywords, AI prompts, content plan, topic research), article writer, Blog content calendar and article page | `main` 01471e2 |
| Overview shows agents waiting for keys; `npm run dev:all` | `main` 074aaa6, bb9e45e |
| Site health page and public share link | `main` 45f6332 |
| Publishing: content API, webhook, WordPress, auto-publish, Publishing settings | `main` c4d84f3 |
| AI visibility tracking and pages | `main` 2a9fd4b |
| Settings: account, business, branding, competitors, writing, schedule, saved pages | `main` 9150e0e |
| Client reports and monthly email agent; brand colour fix | `main` b7531ad |
| This status document, dev fixtures | `main` c783eed |
| Google Analytics + Search Console: connection, sync agents, Site traffic pages, Settings → Analytics | `main` c614000 |
| Article images, Settings → Visuals, CTA cards, promo paragraph, YouTube video, WordPress media upload and post updates | `main` 92ce96e |
| Article improvements: scan, improve agent, review page, Settings → Improvements | `main` |
| Clickable preview of the dashboard for the owner | Private Claude artifact (shared in chat) |
| App set up and running on the owner's Mac at http://localhost:3001 (through a Remote Control session; no code changed there) | Owner's Mac |

## Running it locally

On the Mac the app lives in `~/Documents/vaultio-research/vaultio-live` and runs at
http://localhost:3001 (port 3000 was taken by another app). It was last updated to `2a9fd4b`
(AI visibility), so Settings, Reporting, Site traffic and later changes are not there yet. The
Remote Control connection that set it up ended at 18:51 UTC on 31 October, so the next update has
to be run on the Mac (or after reconnecting Remote Control). After pulling new code:

```bash
git pull
```

```bash
npm run db:migrate
```

Then restart the app and the worker the same way they were started.
