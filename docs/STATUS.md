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
| Overview | `/dashboard/overview` | Built: daily agent activity, planned actions, agents waiting for keys, achievements, what we learned (brand profile), traffic card (empty until Google Analytics) |
| Blog content: calendar | `/dashboard/content-plan` | Built: change topic, instructions, delete, add keywords |
| Blog content: article | `/dashboard/articles/[id]` | Built: article, sources, FAQ, quality checks, publish now, export |
| Blog content: improvements | `/dashboard/content-plan/improvements` | Empty state only (agent not built) |
| Site health | `/dashboard/geo-audit` + public share page | Built |
| AI visibility (overview, prompts, brands, sources, prompt detail) | `/dashboard/ai-visibility` | Built |
| Reporting | `/dashboard/reporting` | Built: sections, live preview, Download PDF, monthly email |
| Settings: Account, Business, Branding, Competitors, Saved pages, Writing, Schedule, Publishing | `/dashboard/settings/*` | Built |
| Clients (agency) | `/clients` | Built |
| Invoices (agency) | `/clients/invoices` | Built; empty until billing exists |
| Backlinks | `/dashboard/backlink-exchange` | **Placeholder** |
| Socials (Reddit, Quora) | `/dashboard/socials` | **Placeholder** |
| Site traffic: All, AI search, Google | `/dashboard/analytics/*` | **Placeholder** (needs Google connection) |
| Settings: Team members, Billing, White label, Product catalog, Visual, Improvements, Analytics, Reddit, Quora | `/dashboard/settings/*` | **Placeholder** |
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
| Google Analytics sync, AI traffic report, Google rankings check | Not built (needs Google connection) |
| Backlink exchange, content improvements, Reddit / Quora, images | Not built |

### How it was checked

- Each built page was opened in a browser and checked for errors; the main pages also at phone width.
- The full onboarding → plan → research → write → publish pipeline ran against a local test
  website, with stand-in AI and keyword providers (`scripts/test-agents.ts`).
- Publishing was tested against local mock webhook and WordPress servers; the content API was
  tested for valid and invalid keys. The test website and mocks are in `scripts/dev-fixtures/`.
- The monthly report agent ran for real with only the email request intercepted.

## Not yet tested with real keys

These are written against the providers' documentation but have not run live yet:

- Claude: brand profile, prompts, topic research and article writing (needs `ANTHROPIC_API_KEY`).
- DataForSEO: keyword ideas, competitors, SERPs, domain rating (field mapping from their docs).
- ChatGPT and Gemini answers for AI visibility.
- Resend email sending.
- WordPress publishing against a real site.

The first live run on the Mac should be watched; fixes are expected to be small (field names,
limits).

## Still to build, in recommended order

1. **Google Analytics + Search Console**: connect Google per client, daily sync, the three Site
   traffic pages, Settings → Analytics, the rankings and AI-traffic agents, the traffic card on
   Overview and the search sections of reports.
2. **Images**: hero and in-article images for articles; Settings → Visual.
3. **Content improvements**: agent that refreshes older articles; Improvements tab and settings.
4. **Backlinks**: backlink exchange matcher between client sites, Backlinks page, credits.
5. **Socials**: Reddit and Quora agents, Socials page, their settings (also fills the report's
   community section).
6. **Team and billing**: Team members (invites), Billing with Stripe, invoices, White label settings.
7. **Agency settings**: profile, branding, custom domain hosting, members, talk with team.
8. **More publishing platforms**: Shopify, Webflow, Wix, Ghost, Framer, hosted blog.
9. **Product catalog** settings.
10. **Translations** for the other languages.
11. **Production launch**: hosting for the web app and the worker, managed Postgres, then point
    `app.vaultio.co` at Vaultio instead of the Babylovegrowth white label.

## Needed from the owner

| Item | Why | Status |
|---|---|---|
| Anthropic and DataForSEO keys in the Mac `.env` | Agents that write and research | **Not saved**: the hidden key pop-ups ran at 07:44 UTC but all three came back empty (skipped or timed out). Needs to be redone with someone at the Mac |
| Google Cloud OAuth client | Google Analytics + Search Console (step 1 above) | Not started; steps were sent in chat |
| Resend account + verified sender (`RESEND_API_KEY`, `REPORT_FROM_EMAIL`) | Monthly report emails | Not started |
| OpenAI / Gemini keys (optional) | ChatGPT and Gemini in AI visibility | Optional |
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
| This status document, dev fixtures | `main` |
| Clickable preview of the dashboard for the owner | Private Claude artifact (shared in chat) |
| App set up and running on the owner's Mac at http://localhost:3001 (through a Remote Control session; no code changed there) | Owner's Mac |

## Running it locally

On the Mac the app lives in `~/Documents/vaultio-research/vaultio-live` and runs at
http://localhost:3001 (port 3000 was taken by another app). It was last updated to `2a9fd4b`
(AI visibility), so Settings, Reporting and later changes are not there yet. After pulling new code:

```bash
git pull
```

```bash
npm run db:migrate
```

Then restart the app and the worker the same way they were started.
