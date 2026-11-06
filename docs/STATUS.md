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
| App shell | Header, sidebar, mobile menu, product-updates bell (reads `product_updates`; no updates published yet) with "Request a feature" (saved in `feature_requests`, emailed to `SUPPORT_EMAIL` when set) |
| Languages | Articles in 36 languages, several per website: each extra language is a "language site" (own keywords, content plan, articles and market, started from the website's settings, shared product catalog), added from the website menu; the Scale plan includes 3, more with the language add-on. Dashboard text in `src/messages/en.json`; fr/nl/de/es/pt/it show English until `scripts/translate-messages.ts` is run (needs the Claude key) |
| Background agents | Job queue, daily scheduler, onboarding that catches up when keys are added later, every run recorded |
| Team | Members with Admin / Member roles and per-website access, email invitations (or a copyable link), invite acceptance page |
| Billing | Stripe per website: Grow / Scale plans (monthly or yearly, free trial), add-ons (AI prompts, Reddit+, Quora+, backlink credits), checkout, customer portal, plan change, pause, cancel, invoices, webhooks; plan limits applied to prompts, social keywords and credits; agents pause without an active plan |

### Pages

| Page | Route | Status |
|---|---|---|
| Sign in / Sign up / Forgot password | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` | Built (reset emails need Resend; on an agency domain they carry the agency's brand, domain and sender) |
| Add a website (onboarding wizard) | `/onboarding/website`, `/onboarding/[step]` | Built: address check (social profiles, site-builder addresses and unknown domains refused), market and language (detected from the site), business description and audiences (written by Claude from the site, edited by the owner; "We couldn't reach …" with Restart onboarding), competitors (suggested from keyword data, add/remove, optional), brand colours (found on the site), the look of images, an example article for the voice and the cover style, Search Console (optional), "How did you hear about us?" (once per workspace) and the plan with its free trial (when billing is on). The onboarding agents keep what the owner confirmed; progress shows on Overview |
| Agency setup | `/onboarding/agency/[step]` | Built: "Setting up for your clients?" on the first step, then agency website (prefills name and colours), white label or branded reports only, branding, hosting and sending domains with DNS records, invite the team, book a call |
| Overview | `/dashboard/overview` | Built: daily agent activity, planned actions, agents waiting for keys, achievements, what we learned (brand profile), traffic sources card, "Get started" checklist (connect website required; Search Console, Google Analytics, walkthrough video and docs optional) |
| Blog content: calendar | `/dashboard/content-plan` | Built: drag a topic to another future day, choose a topic for an empty day (from the plan's unused topics or your own), change topic, instructions, delete, add keywords; status per day (queued, generating, ready, published, draft), where each topic came from (Google keywords or an AI assistant's answers that didn't mention the site), "content engine running / stopped" banner, editing locked while an article is being written |
| Blog content: article | `/dashboard/articles/[id]` | Built: article with images and CTA cards, cover image panel (regenerate, up to 5 AI images per article), sources, FAQ, quality checks, publish now / re-publish / unpublish, export, feedback (a backlink credit for the first one) with "regenerate with instructions" or "pick a new topic" |
| Article editor | `/dashboard/articles/[id]?edit=1` | Built: title, rich text (toolbar, "/" insert menu, links, tables, YouTube, alignment), images (alt text, caption, suggested, upload, AI image with side-by-side review), cards kept as blocks, slug and meta description, live counts; AI edits on selected text (rewrite, improve, longer, shorter, simplify, grammar, list, table, add keyword, add internal link, custom) with versions to accept; AI tables; an AI assistant chat that proposes block changes to accept or reject; Save & Close re-renders the article and recomputes counts, FAQ, schema and checks |
| Blog content: improvements | `/dashboard/content-plan/improvements` + `/[id]` | Built: opportunities with evidence, status, discard, how it works; review page with per-change approve/reject, safety flags, publish, impact; existing WordPress posts marked as such, with their kept elements, post data and an "Edit in WordPress" link |
| Site health | `/dashboard/geo-audit` + public share page | Built: the reference's full check list (crawler files incl. robots.txt blocking search engines and an unreadable sitemap; titles and descriptions missing, too long/short, duplicated on other pages, more than one, not matching the page; H1, canonical missing / more than one / pointing to another site; broken links and images, images over 100 KB, missing and weak alt text, unknown image formats; slow pages from PageSpeed Insights (mobile, with LCP, CLS and TBT); structured data; customer questions not answered), by issue / by page with each page's speed, "Validate fix" per issue (re-checks the live site, marks it fixed and updates the scores), how to fix the whole site, choose pages, share |
| AI visibility (overview, prompts, brands, sources, prompt detail) | `/dashboard/ai-visibility` | Built |
| Reporting | `/dashboard/reporting` | Built: sections, live preview, Download PDF, monthly email |
| Settings: Account, Business, Branding, Competitors, Saved pages, Writing, Visuals, Schedule, Improvements, Publishing, Analytics | `/dashboard/settings/*` | Built (Visuals includes the infographic switch and style). Writing and image instructions are reviewed by Claude when added: split into one rule per line, conflicting rules removed, matching settings switched (e.g. "no table of contents"), image remarks moved to Visuals, requests that can't be done explained; "What changed", recent changes, edit and remove. Article feedback and regeneration requests become rules too ("From your feedback on …") |
| Settings: Publishing | `/dashboard/settings/publishing` | Built: auto-publish, API, webhook, blog hosting (with its own logo and accent colour), WordPress, WordPress.com (one-click OAuth, no plugin), Shopify, Webflow, Wix, Ghost, BigCommerce, GoHighLevel, and the platforms that pull articles: Next.js Blog (npm package with a ready-made /blog), Framer (plugin), Lovable (one prompt) and Duda (RSS feed), each with a step-by-step setup guide; "{platform} detected" hint from the site analysis. Overview shows "Setup pending — Connect {platform}" until articles have a way to the site. The Backlinks page warns when the latest published articles aren't live or aren't in the sitemap (checked daily), with the Blog path URL in Settings → Business |
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
| Brand profile, AI prompts, content plan, topic research, article writer | Built (Claude). The writer runs a plagiarism check against the pages it researched and the pages ranking for the keyword (8-word overlaps); copied paragraphs are rewritten once and the result shows in the article's quality checks |
| Competitors, keyword research, competitor gap scan, domain rating | Built (DataForSEO) |
| AI visibility check (Claude, plus ChatGPT, Gemini and Perplexity when keyed) | Built |
| Publishing: content API, webhook, WordPress, Shopify, Webflow, Wix, Ghost, BigCommerce, GoHighLevel, hosted blog, auto-publish | Built (publish or save as draft per platform; republishing updates the same post). Framer, Lovable and Duda fetch published articles themselves (content API or RSS feed) |
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
- Changes from the 5 November web check (the reference's current docs and the vendors' docs, read by a
  separate research session; notes on the `web-check` branch): Writing settings (article types, length
  mode, citations, recommended reads, link format, English variants) saved in a browser and covered by
  `scripts/test-writing.ts`; Ghost author lookup, GoHighLevel update response and the Wix cover import
  against the CMS mock; the Framer plugin's sync again with its new storage.
- Article editor, in a browser (`scripts/test-editor.ts` for the conversions): typing, the "/" menu,
  tables (rows, header), YouTube, links, an image caption, slug and meta, Save & Close (caption shown
  as a figure, card and video kept, "re-publish" asked because pushed platforms are connected); AI
  edits on a paragraph and on part of a sentence, "try another", the AI table, the assistant's
  proposal accepted and its conversation kept and cleared, against a local Anthropic stand-in
  (`scripts/dev-fixtures/mock-anthropic.py`). Unpublish (posts turned into drafts on BigCommerce and
  GoHighLevel, gone from feeds), re-publish, feedback with a credit, regeneration with instructions and
  with a typed new topic run by the worker (same article id and address).
- More publishing platforms, in a browser against the local mock (`scripts/dev-fixtures/mock-cms.py`):
  BigCommerce (store hash taken from a pasted store address, wrong token, wrong WebDAV password, then
  connected with cover images; the WebDAV login is checked with digest authentication and the check
  file removed again) and GoHighLevel (Location ID and token, blogs, authors and categories listed,
  saved as drafts). Publishing an article sent it to both (cover copied to the store as the post
  thumbnail; author and category on GoHighLevel); republishing updated the same posts and kept their
  address and date; a post deleted on the platform was created again, and a BigCommerce address
  already taken got "-2". Framer, Lovable and Duda guides: checklists, separate Framer and Lovable keys
  (each shown once, "last used" on the card), the Lovable prompt copied with the agency's brand and
  API address, the Duda feed address created, shown again, replaced (the old one then answers 401) and
  disconnected. The Framer plugin's sync ran against the dev API with a stand-in Framer collection
  (`integrations/framer-plugin/scripts/test-sync.ts`: first import, nothing changed on a second run, a
  changed article fetched again, a removed one taken out, a wrong key explained); the content API
  answers the plugin's browser preflight only from Framer's addresses. The Duda feed is valid RSS
  with each article's full text and cover image; the hosted blog's RSS still works.
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
- Languages: adding Spanish and Japanese from the website menu in a browser (the new language opens,
  the menu lists it under its website, its Billing and Product catalog pages), the dialog and the
  language's Billing page with no plan, Grow and Scale (Stripe mock); `scripts/test-languages.ts`:
  copies of the website's settings with their own language and market, seed topics written in the new
  language without touching the business details, the shared catalog, Scale covering the 3 oldest
  languages and the add-on covering a 4th. Infographics drawn in Japanese, Thai and Hindi with fonts
  fetched from Google Fonts. The translation script ran on all 2,015 strings with a stand-in
  translator, and its check caught a renamed placeholder, a lost plural and an unclosed tag.
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
- ChatGPT, Gemini and Perplexity answers for AI visibility (Perplexity: Sonar chat completions with `citations` / `search_results`, tried only against a stand-in).
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
- Languages with real providers: seed topics and articles from real Claude in each language,
  DataForSEO's language codes for Chinese (zh-CN / zh-TW) and Norwegian ("no"), and the dashboard
  translations with real Claude (to be read by a native speaker before launch).
- The product catalog against real stores: Shopify's GraphQL products query (field names from
  Shopify's documentation, which couldn't be fetched from this workspace to double-check, API version
  set by `SHOPIFY_API_VERSION`), WooCommerce's REST API on a real store, and real Google Merchant Center
  and Facebook feeds; product matching with real Claude.
- OpenAI: `gpt-image-1` was shut down on 23 October 2026; images now use `gpt-image-2.5-sunburst`
  (then `gpt-image-2.5-flare`), names taken from OpenAI's SDK, not tried live. ChatGPT visibility
  answers now use the Responses API with web search (`gpt-5.4-mini`) so they cite real sources.
- Wix covers are imported into the site's Media Manager first; the exact way the draft post references
  the imported file is the best reading of Wix's schema, not tried live.
- AI editing with real Claude (selection edits, tables, the assistant's block proposals) and
  regeneration with real research and writing; the stand-in only returns canned answers.
- BigCommerce, GoHighLevel, Duda, Framer and Lovable against real accounts: written from their
  documented APIs and help pages, which couldn't be fetched from this workspace to double-check.
  Least certain: GoHighLevel's list response keys and which post fields it requires, BigCommerce's
  WebDAV address and digest login, the origin Framer's editor loads plugins from (the content API
  allows `*.framercdn.com` and `*.framer.com`; `CONTENT_API_CORS_ORIGINS` changes it), and how well
  Lovable follows the prompt. The Framer plugin has only run outside Framer.
- Improving existing posts on a real WordPress site: how real posts from different themes and
  plugins are cut into pieces, whether WordPress's editor accepts the new blocks without a
  "This block contains unexpected content" notice (they are written like the site's own blocks, in
  the older form when unsure), detection of SEO-plugin titles and descriptions from the live page,
  and Claude keeping the element tokens in place.

The first live run on the Mac should be watched; fixes are expected to be small (field names,
limits).

## Still to build, in recommended order

1. **Production launch**: hosting for the web app and the worker, managed Postgres, then point
   `app.vaultio.co` at Vaultio instead of the Babylovegrowth white label.

White-label items not built yet: a white-labelled WordPress plugin, and Google sign-in on agency
domains (email and password only, as in the reference product).

Billing items not built yet: the Instagram/Facebook add-on (left out on purpose) and the reference
product's "next growth market" language suggestion (it needs a speaker-count source to quote).
Volume discounts, seat limits, the onboarding plan step, cancellation retention offers, free
languages locked during a Scale trial and paused after leaving Scale ("Keep this language") are built.

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
| Perplexity API key (`PERPLEXITY_API_KEY`), optional | Perplexity answers in AI visibility (the reference's marketing lists Perplexity; its docs now track ChatGPT and Claude) | Not started; optional |
| Vaultio logo files | Replace the placeholder "V" mark | Received (dragon mark, `research/assets/vaultio_favicon.png` on the `research` branch); not yet used in the app |
| Reddit Data API app (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) | Optional: votes, comment counts and dropping archived or locked threads on the Reddit page | Not started; commercial use needs Reddit's approval |
| Stripe account (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) | Billing (built, waiting for this) | Not started. Then: run `scripts/stripe-setup.ts`; add the webhook endpoint `https://<app domain>/api/stripe/webhook`; turn on plan switching and cancellation in Stripe's customer portal settings |
| Price of the language add-on (`vaultio_language_monthly`) | Websites on Grow can add languages only once it has a price; Scale's 3 included languages work without it, and during a Scale trial new languages need it | Waiting for a decision. The reference's Scale offer says its 3 included languages are "worth $147/mo if purchased separately", i.e. $49 a month each |
| Dashboard translations | Run `npx tsx --tsconfig tsconfig.json scripts/translate-messages.ts` once the Claude key is in `.env`, check the result, commit `src/messages/*.json` | Waiting for the Claude key |
| Prices for Reddit+, Quora+ and backlink credits (and how many credits) | No reference price was seen, so these aren't on sale until set in `scripts/stripe-prices.json` | Waiting for a decision. Grow $99/mo ($59/mo yearly), Scale $399/mo ($239/mo yearly, $2,872 a year, as on the reference pricing page on 5 November 2026), +30 prompts $49/mo and +50 prompts $89/mo are copied from the reference |
| Vercel project token (`VERCEL_TOKEN`, `VERCEL_PROJECT_ID`) if the app is hosted on Vercel | Agencies' own domains get HTTPS automatically | Waiting for the hosting decision |
| Booking link and support email (`SUPPORT_BOOKING_URL`, `SUPPORT_EMAIL`) | Agency settings → Talk with team, and the agency setup's last step | Not set |
| Help links (`HELP_DOCS_URL`, `WALKTHROUGH_VIDEO_URL`) | Optional "Read the docs" / "Watch the walkthrough video" items in the Overview checklist | Not set (the items stay hidden until then) |
| Retention offer (`RETENTION_COUPON_ID`) | Optional discount offered once in the cancellation flow, as the reference product does | Waiting for a decision: create a coupon in Stripe (e.g. 20% for 3 months) and set its id; without it the flow offers pausing instead |
| Which workspaces aren't billed | Vaultio's own workspace should be exempt: `update organizations set billing_exempt = true where id = …` | Waiting for the production database |
| Hosting accounts (web, worker, Postgres) | Production launch | Later |
| Publish the Framer plugin | Clients import articles into Framer with it | Not started. In `integrations/framer-plugin`: set `VITE_API_BASE` (the production app address + `/api/integrations`) and `VITE_BRAND_NAME`, run `npm install && npm run pack`, submit `plugin.zip` at framer.com/developers (needs a Framer account), then put the marketplace link in `FRAMER_PLUGIN_URL`. Until then the Framer guide tells clients to search the Plugins menu |
| WordPress.com app (`WPCOM_CLIENT_ID`, `WPCOM_CLIENT_SECRET`) | Clients on WordPress.com connect in one click | Not started. Create an app at developer.wordpress.com/apps with the redirect URL `https://<app domain>/api/integrations/wordpress-com/callback` (on `APP_URL`). The integration follows WordPress.com's OAuth2 and REST v1.1 API; it was tested against a stand-in because developer.wordpress.com isn't reachable from the build environment, so do one real connection and publish once the app exists |
| Publish the Next.js blog package | Clients with a Next.js site get a ready-made blog | Not started. In `integrations/next-blog`: pick the npm name (default `vaultio-next-blog`; set `NEXT_BLOG_PACKAGE` in the app if you change it), `npm install && npm publish` (needs an npm account) |
| Snapps API documentation or access | The reference product publishes to Snapps; Snapps' API isn't publicly documented anywhere reachable, so it isn't built | Waiting: needs Snapps' API docs (endpoint, auth, Site ID use) or a test account |
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
| More languages: language sites (36 content languages), Scale's included languages and the language add-on, infographic fonts for more scripts, dashboard translation script | `main` 2281efb |
| Publishing to BigCommerce and GoHighLevel; Framer plugin, Lovable prompt and Duda RSS feed | `main` d844cbc |
| Article editor with AI editing and the assistant; feedback, regenerate, new topic, unpublish, re-publish | `main` a712603 |
| Parity with the reference's current docs and fixes from checking the vendors' docs: writing options, backlink rules, Site health scoring, image/ChatGPT models, platform fixes | `main` 6c92f07 |
| Content calendar (move, plan a day, sources, statuses, engine banner), topics from AI-assistant citations, AI-reviewed writing and image instructions, plagiarism check | `main` 92bf14a |
| Onboarding wizard (market, business, competitors, brand, Search Console, survey, plan) and agency setup wizard | `main` b8917f9 |
| Site health: the full check list, PageSpeed Insights, broken links and images, validate fix | `main` a8f12e5 |
| Publishing: Next.js blog package, WordPress.com, detected platform, published-articles check and blog path, hosted blog logo and colour | `main` ccf0ea2 |
| Get started checklist, target location (country or region/city), weekly progress email, editable AI prompts, cancellation flow, end trial now, unverified blog cleanup | `main` 6ebb15c |
| Saved pages search, set password for Google sign-ins, request a feature, 404 for invalid ids | `main` 12dcd0f |
| Webflow field mapping step, webhook link rule and oldest-article test | `main` f755d26 |
| Volume discounts, seat limits, free languages locked during a Scale trial and paused after leaving Scale | `main` bd3817a |
| Reddit: trending threads in followed subreddits, and why each opportunity was found | `main` 56a5be6 |
| Perplexity in AI visibility (optional key) | `main` (this commit) |
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
