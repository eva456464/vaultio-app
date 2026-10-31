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
- Nothing is posted to Reddit or Quora automatically: the agents find threads and draft replies,
  and a person posts them (see "Left out on purpose" below).

## Done

### Platform

| Area | What works |
|---|---|
| Accounts | Sign up, sign in, sessions; each sign-up gets its own workspace |
| Agencies and clients | Agency workspace with many client sites, website selector, site mode and agency mode |
| White label | Agencies set their name, logo, favicon and colours and connect their own hosting domain (Vercel or CNAME) and email sending domain (Resend); their clients see only the agency's brand on that domain, and invites and reports come from the agency |
| App shell | Header, sidebar, mobile menu, product-updates bell (reads `product_updates`; no updates published yet) |
| Languages | English text in `src/messages/en.json`; routes for fr/nl/de/es/pt/it fall back to English |
| Background agents | Job queue, daily scheduler, onboarding that catches up when keys are added later, every run recorded |
| Team | Members with Admin / Member roles and per-website access, email invitations (or a copyable link), invite acceptance page |
| Billing | Stripe per website: Grow / Scale plans (monthly or yearly, free trial), add-ons (AI prompts, Reddit+, Quora+, backlink credits), checkout, customer portal, plan change, pause, cancel, invoices, webhooks; plan limits applied to prompts, social keywords and credits; agents pause without an active plan |

### Pages

| Page | Route | Status |
|---|---|---|
| Sign in / Sign up / Forgot password | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` | Built (reset emails need Resend; on an agency domain they carry the agency's brand, domain and sender) |
| Add a website (onboarding) | `/onboarding/website` | Built; onboarding progress shows on Overview |
| Overview | `/dashboard/overview` | Built: daily agent activity, planned actions, agents waiting for keys, achievements, what we learned (brand profile), traffic sources card |
| Blog content: calendar | `/dashboard/content-plan` | Built: change topic, instructions, delete, add keywords |
| Blog content: article | `/dashboard/articles/[id]` | Built: article with images and CTA cards, cover image panel (regenerate, up to 5 times), sources, FAQ, quality checks, publish now, export |
| Blog content: improvements | `/dashboard/content-plan/improvements` + `/[id]` | Built: opportunities with evidence, status, discard, how it works; review page with per-change approve/reject, safety flags, publish, impact; existing WordPress posts marked as such, with their kept elements, post data and an "Edit in WordPress" link |
| Site health | `/dashboard/geo-audit` + public share page | Built |
| AI visibility (overview, prompts, brands, sources, prompt detail) | `/dashboard/ai-visibility` | Built |
| Reporting | `/dashboard/reporting` | Built: sections, live preview, Download PDF, monthly email |
| Settings: Account, Business, Branding, Competitors, Saved pages, Writing, Visuals, Schedule, Improvements, Publishing, Analytics | `/dashboard/settings/*` | Built (Visuals includes the infographic switch and style) |
| Site traffic: All traffic, AI search traffic, Google traffic | `/dashboard/analytics/ga4`, `/ai-traffic`, `/google-traffic` | Built: KPIs, channel / AI-model / Google charts, breakdowns, countries, top pages and searches with search, "brand articles only" and paging; connect state until Google is connected |
| Clients (agency) | `/clients` | Built |
| Invoices (agency) | `/clients/invoices` | Built: invoices across all client websites (from Stripe); "Manage all subscriptions" on Clients opens Stripe's portal |
| Backlinks | `/dashboard/backlink-exchange` | Built: exchange switch, how credits work, credits / received (value) / given / domain rating cards, exchange pool chart, given and received tables with live, awaiting, nofollow and removed states |
| Socials: Reddit, Quora | `/dashboard/socials?tab=reddit` / `?tab=quora` | Built: To reply / Replied, suggested replies, Copy & open, Draft a reply, edit, redraft, mark replied, not relevant, why it's relevant, paging, empty states |
| Settings: Reddit, Quora | `/dashboard/settings/reddit`, `/quora` | Built: monitored keywords (5 per platform) with suggestions, custom keywords, subreddits (Reddit), reply style |
| Settings: Team members | `/dashboard/settings/team-members` | Built: workspace name, members and invitations, invite dialog, role and website access changes, remove |
| Settings: Billing | `/dashboard/settings/billing` | Built: plan picker with trial, active subscription (plan, next invoice, status, pause, cancel, manage in Stripe), Upgrade to Scale, add-ons, payment history, "Email me my invoices" |
| Invitation | `/invite/[token]` | Built: create an account or sign in with the invited email, then join |
| Settings: White label ("Branding and domains") | `/dashboard/settings/white-label` | Built: brand (name, logo, favicon, colours, preview) and domains (hosting + email sending, DNS records, check again) |
| Agency settings: Profile, Members, Branding, Hosting, Talk with team | `/clients/settings/*` | Built (Profile also on Settings → Account: dashboard language and account deletion after 14 days) |
| Settings: Product catalog | `/dashboard/settings/product-catalog` | Built: Shopify and WooCommerce connection wizards, sync status and "Sync catalog", products table with search, status filter, paging and "Include in articles", add by hand (with photo), file import (XML, CSV, Excel), Google Shopping / Facebook feeds, synced product view; product picker in the article instructions, product chips in the calendar, featured products on the article page |

### Agents

| Agent | Status |
|---|---|
| Website analysis, sitemap sync, site health audit, milestones | Built, no keys needed |
| Brand profile, AI prompts, content plan, topic research, article writer | Built (Claude) |
| Competitors, keyword research, competitor gap scan, domain rating | Built (DataForSEO) |
| AI visibility check (Claude, plus ChatGPT and Gemini when keyed) | Built |
| Publishing: content API, webhook, WordPress, Shopify, Webflow, Wix, Ghost, hosted blog, auto-publish | Built (publish or save as draft per platform; republishing updates the same post) |
| Monthly client report email | Built (Resend) |
| Article images, CTA cards, promo paragraph, YouTube video | Built (OpenAI or Gemini images; Claude for scenes, wording and the video search) |
| Google Analytics sync, AI traffic report, Google rankings check (Search Console) | Built |
| Article improvements (scan + improve) | Built for articles Vaultio wrote (any platform) and existing WordPress posts (block and classic editor, keeping their images, embeds, tables, plugin blocks and styling; page-builder posts are skipped) |
| Backlink exchange: placement in new articles, daily live check, credits | Built |
| Reddit and Quora: keyword suggestions, weekly thread search (Google via DataForSEO, or Claude web search), relevance scoring, reply drafts | Built (Claude; DataForSEO and the Reddit Data API optional) |
| Product catalog: catalog sync (Shopify, WooCommerce, feeds) and product matching for upcoming articles; articles link their products and show a product card | Built (matching uses Claude when available, otherwise distinctive words of the product name) |
| Infographics: one per article, Editorial or Classic style, numbers checked against the article | Built (Claude picks the section and data; Vaultio draws it in the brand colours and logo; the Editorial illustration needs OpenAI or Gemini) |

### How it was checked

- Each built page was opened in a browser and checked for errors; the main pages also at phone width.
- The full onboarding → plan → research → write → publish pipeline ran against a local test
  website, with stand-in AI and keyword providers (`scripts/test-agents.ts`).
- Publishing was tested against local mock webhook and WordPress servers; the content API was
  tested for valid and invalid keys. The test website and mocks are in `scripts/dev-fixtures/`.
- The monthly report agent ran for real with only the email request intercepted.
- Google: the connect → consent → property → sync → pages flow, token refresh, re-syncs, disconnect and
  reconnect ran end to end against a local mock of Google's APIs (`scripts/dev-fixtures/mock-google.py`).
- Team: invite → sign up with the invited email → accept → limited website access → role and
  access changes → remove, in a browser.
- Publishing platforms: connecting Ghost (including a wrong key), Webflow (site and collection picked
  from the token), Shopify (client credentials, blog list) and Wix (site ID from the dashboard
  address) in the browser, then publishing an article to all of them and republishing it (each
  updated the same post), against a local mock (`scripts/dev-fixtures/mock-cms.py`); the hosted
  blog on a local test domain from DNS setup to live, with its pages, sitemap, robots and RSS.
- White label: logo and favicon upload, colours, hosting and sending domains from "Setup pending" with
  DNS records to "Connected", the agency's brand on its own domain, and an invite email sent from
  the agency's domain with a link to it, against a local Vercel/Resend mock
  (`scripts/dev-fixtures/mock-domains.py`); account deletion and the 14-day purge.
- Billing: checkout with trial, webhooks, upgrade to Scale yearly, Reddit+ and backlink-credit
  add-ons (limits and credits applied), pause, cancel and keep, invoices and the agents' pause,
  against a local Stripe mock (`scripts/dev-fixtures/mock-stripe.py`).
- Reddit and Quora: both search paths (Google results and web search) ran with stand-in answers
  (`scripts/test-socials.ts`), plus the Reddit Data API mock; the pages were driven in a browser
  (copy & open, mark replied, edit, not relevant, keywords, subreddits, reply style).
- Infographics: all five layouts drawn in both styles (including Cyrillic text) and checked by eye;
  an article written with a stand-in answer got its infographic with the site's logo and colour at
  the end of the right section; made-up numbers and bars that don't match their labels are rejected;
  the Visuals switch saves on and off.
- Product catalog, against a local store and feed mock (`scripts/dev-fixtures/mock-store.py`) in a
  browser: Shopify connect (wrong and right credentials) and sync through the worker, WooCommerce
  errors (wrong key, key without Read access, a store URL that redirects) and sync, one store platform
  at a time, disconnect (synced products removed, manual kept), adding a product with a photo, CSV, XML
  and Excel imports (photos copied), a Google Shopping feed with variants, search, filters, the include
  switch and its URL rule, edit and delete. Matching and writing with stand-in answers
  (`scripts/test-catalog.ts`): products matched only where they fit, nothing re-matched while the
  catalog is unchanged, the article links its products and shows the card after the right paragraph;
  the picker (edit, save, back to the suggestion) and the article page in a browser.
- Improvements of existing WordPress posts, against a mock WordPress site with a block-editor post
  (image, table, embed, styled paragraph, anchored heading, Yoast FAQ and table of contents), a
  classic-editor post (caption shortcode, "more" marker, custom SEO title) and an Elementor post
  (`scripts/test-wordpress-improvements.ts`, `scripts/dev-fixtures/mock-wordpress.py`): every post
  reassembles byte for byte, untouched sections stay byte for byte the same after publishing, every
  element and the link attributes survive a rewrite, the competitor link is removed, the SEO-plugin
  title and description are left alone, the Elementor post is skipped and a post edited in WordPress
  in the meantime isn't overwritten. The list and review pages were checked in a browser, and a
  classic post was published from the review page. Improvements of Vaultio's own articles were run
  again end to end.

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
- Backlink placement with real Claude, and live-link checks against real client sites.
- Reddit and Quora: `site:` searches through DataForSEO, Claude's web search limited to
  reddit.com / quora.com, relevance scores and reply drafts with real Claude, and the Reddit
  Data API (tested against a local mock, `scripts/dev-fixtures/mock-reddit.py`).

- Stripe itself: real Checkout, the customer portal, proration on plan changes, webhook delivery
  and invoice PDFs (written against the Stripe SDK's types for API version 2026-10-28).
- Invitation and invoice emails through Resend.
- Shopify, Webflow, Wix and Ghost against real accounts (written from their documented APIs, which
  couldn't be fetched from this workspace to double-check; Wix is the least certain, and Wix posts
  get no cover image yet).
- White label against the live Vercel and Resend APIs (domain add/verify/config, Resend domains):
  written from their documented APIs, which couldn't be fetched from this workspace to double-check.
- Infographic specs from real Claude (how often it finds a section worth charting and passes the
  number checks), and the Editorial illustration from a real image provider.
- The product catalog against real stores: Shopify's GraphQL products query (field names from
  Shopify's documentation, which couldn't be fetched from this workspace to double-check, API version
  set by `SHOPIFY_API_VERSION`), WooCommerce's REST API on a real store, and real Google Merchant Center
  and Facebook feeds; product matching with real Claude.
- Improving existing posts on a real WordPress site: how real posts from different themes and
  plugins are cut into pieces, whether WordPress's editor accepts the new blocks without a
  "This block contains unexpected content" notice (they are written like the site's own blocks, in
  the older form when unsure), detection of SEO-plugin titles and descriptions from the live page,
  and Claude keeping the element tokens in place.

The first live run on the Mac should be watched; fixes are expected to be small (field names,
limits).

## Still to build, in recommended order

1. **More languages**: content in extra languages per website (the Scale plan's 3 languages and the
   language add-on), and translations of the app itself. Infographics will need Chinese, Japanese,
   Korean and Arabic fonts for those languages.
2. **Remaining publishing platforms**: Framer (needs a Vaultio Framer plugin published on Framer's
   marketplace), Lovable, GoHighLevel, Duda, BigCommerce.
3. **Production launch**: hosting for the web app and the worker, managed Postgres, then point
   `app.vaultio.co` at Vaultio instead of the Babylovegrowth white label.

White-label items not built yet: a white-labelled WordPress plugin, and Google sign-in on agency
domains (email and password only, as in the reference product).

Billing items not built yet: the onboarding "choose a plan" step (a new website is set up for free,
then the Overview asks for a plan), volume discounts for several websites, seat limits, the
cancellation retention offers, and the language and Instagram/Facebook add-ons. The Scale plan is
only advertised with what Vaultio delivers today (50 tracked questions, priority support), not the
reference product's 120 articles in 4 languages.

Left out on purpose:

- **Reddit autopilot** (the reference product can post replies from a connected Reddit account on a
  daily limit). Automated promotional comments break Reddit's rules on spam and self-promotion and
  get accounts and domains banned; Quora has no posting API at all. Replies are drafted, a person
  posts them. Drafts also say openly when the writer works with the business, instead of posing as
  a customer as the reference product's examples do.
- The Reddit+ / Quora+ upsell cards: they need billing first.

Smaller follow-ups:

- Use the Vaultio dragon logo in place of the "V" mark.
- Product catalog: products in generated article images (the reference turns packshots into
  editorial visuals; Vaultio shows the real product photo in the product card instead), and a white
  label for the Shopify app name shown to store owners.
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
| Reddit Data API app (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) | Optional: votes, comment counts and dropping archived or locked threads on the Reddit page | Not started; commercial use needs Reddit's approval |
| Stripe account (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) | Billing (built, waiting for this) | Not started. Then: run `scripts/stripe-setup.ts`; add the webhook endpoint `https://<app domain>/api/stripe/webhook`; turn on plan switching and cancellation in Stripe's customer portal settings |
| Prices for Reddit+, Quora+ and backlink credits (and how many credits) | No reference price was seen, so these aren't on sale until set in `scripts/stripe-prices.json` | Waiting for a decision. Grow $99/mo ($59/mo yearly), Scale $399/mo ($199/mo yearly), +30 prompts $49/mo and +50 prompts $89/mo are copied from the reference |
| Vercel project token (`VERCEL_TOKEN`, `VERCEL_PROJECT_ID`) if the app is hosted on Vercel | Agencies' own domains get HTTPS automatically | Waiting for the hosting decision |
| Booking link and support email (`SUPPORT_BOOKING_URL`, `SUPPORT_EMAIL`) | Agency settings → Talk with team | Not set |
| Which workspaces aren't billed | Vaultio's own workspace should be exempt: `update organizations set billing_exempt = true where id = …` | Waiting for the production database |
| Hosting accounts (web, worker, Postgres) | Production launch | Later |
| Leftover Blog Hosting setup for `blog.vaultio.co` in the live Babylovegrowth account | Created during research. Vaultio can now host that blog itself (Settings → Publishing → Blog hosting) once it runs in production; until then decide whether to remove the old setup | Waiting for a decision |

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
| Article improvements: scan, improve agent, review page, Settings → Improvements | `main` 8b61cfc |
| Backlink exchange: joining, placement, daily live check, credits, Backlinks page | `main` 31d5e54 |
| Reddit and Quora: keyword suggestions, thread search and scoring, reply drafts, Socials pages, Settings → Reddit / Quora, report section | `main` e2df1d6 |
| Team members: invitations, roles, website access, invite acceptance | `main` 11232fb |
| Billing with Stripe: plans, add-ons, checkout, portal, webhooks, plan limits, agents paused without a plan | `main` ba01389 |
| Agency settings and white label: profile (language, account deletion), members, branding, hosting and sending domains, talk with team, password reset | `main` 2fb49a4 |
| Publishing to Shopify, Webflow, Wix and Ghost, and the hosted blog on clients' subdomains | `main` 830fc80 |
| Infographics: one per article, Editorial or Classic, numbers checked against the article | `main` 6e2e5ab |
| Improvements for existing WordPress posts (block and classic editor), keeping their blocks and styling | `main` a638a11 |
| Product catalog: Shopify, WooCommerce, feeds and files; catalog sync and product matching agents; products in articles | `main` 096b5b4 |
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
npm install
```

```bash
npm run db:migrate
```

Then restart the app and the worker the same way they were started.
