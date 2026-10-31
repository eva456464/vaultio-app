<!-- Source: https://www.babylovegrowth.ai/docs/integrations/lovable -->

Integrations

# Lovable

Add a self-updating blog to your Lovable site with one copy-paste prompt, or let us host it for you.

There are two ways to get your BabyLoveGrowth articles onto a Lovable site. Both publish new articles automatically once they are set up, and both are free.

### Option 1: One prompt

Your blog lives on your own domain at `yoursite.com/blog`, in your own design. Lovable builds it for you from a single prompt. No coding, but you do paste one prompt and one API key.

### Option 2: Blog Hosting

We host your blog at `blog.yoursite.com` and handle everything. You add one DNS record and never touch your Lovable project. Same SEO value as your main domain.

---

## [Option 1: Add the blog with one prompt](#option-1-add-the-blog-with-one-prompt)

Lovable does the whole build. You paste one prompt, then paste your API key when Lovable asks for it.

Then paste it into your Lovable project chat.

### [What Lovable builds for you](#what-lovable-builds-for-you)

- A `/blog` page listing all your articles, and a page for every article, styled to match your existing site.
- A copy of your articles inside your own project, refreshed every hour, so new articles appear on your site without you doing anything.
- Full SEO setup: page titles, meta descriptions, canonical URLs, social preview images, schema markup, sitemap and robots.txt.
- A "Blog" link added to your site navigation.

### [Step by step](#step-by-step)

1. **Get your API key.** In BabyLoveGrowth, open **Settings → Publishing**, click the **Lovable** card, then **Generate API Key** and copy it. The card walks you through these same steps.
2. **Copy the prompt** with the button above.
3. **Paste it into the Lovable chat** of the project you want the blog on, and send it.
4. **Paste your API key when Lovable asks.** Lovable opens a secure secret field for it. Paste it there, never into the normal chat box.
5. **Let it finish, then publish.** Lovable builds the pages and pulls in your articles. When it is done, open `/blog` on your site to check, then hit **Publish**.

The first import takes a few minutes

Our API is rate limited, so your articles arrive in batches of 20, and the import keeps running in the background on its own. No extra Lovable messages, no credits. If your blog looks short at first, wait a few minutes and refresh.

### [Before you start](#before-you-start)

- The prompt works on both kinds of Lovable projects: newer server-rendered ones and older single-page ones. Lovable detects which it has and adapts.
- Your project needs **Lovable Cloud** enabled. If it is not, the prompt tells Lovable to turn it on.
- You need at least one generated article in your BabyLoveGrowth account, otherwise there is nothing to import yet.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

### [Troubleshooting](#troubleshooting)

Lovable says the key is invalid (401)

Generate a fresh key in **Settings → Publishing → Lovable**, then tell Lovable: "update the BABYLOVEGROWTH\_API\_KEY secret" and paste the new key into the secure field.

The blog page is empty

The import keeps running in the background, so give it a few minutes and refresh before doing anything. If it is still empty after that, check that articles exist in your BabyLoveGrowth dashboard, then ask Lovable to "run blg-sync and show me what it returns".

New articles are not showing up

The sync runs hourly. Ask Lovable to "check the blg-sync scheduled job is enabled and run it now". Remember to publish your Lovable project after changes.

The articles do not match my site's design

Tell Lovable what to change in plain language, for example "make the blog post typography match the rest of the site and widen the content area". The articles are stored in your project, so restyling them does not re-import anything.

Read the full prompt

Prompt

```
Add a fully automated, SEO-ready blog to this website, powered by my BabyLoveGrowth account.

Build it in one pass. Do not ask me design or architecture questions — match this project's existing design system, components, fonts and colors. The only thing you ask me for is the secret in Step 2.

## Rules

These prevent the two things that break this integration: leaking the key, and tripping the API's rate limits.

1. **Never call `api.babylovegrowth.ai` from browser/client code.** The API rejects browser origins with CORS and the key must never reach the browser. Backend only.
2. **Never put the API key in frontend code, a `VITE_`/public env var, a config file, the repo, or chat.** It lives only as a backend secret.
3. **The website never calls BabyLoveGrowth on a page view.** Pages read only from this project's own database.
4. **Limits are 2 requests/second and 30 requests/minute per key.** Fetch strictly sequentially with at least 2100 ms between calls. Never `Promise.all` API calls.
5. **Always send an application-specific `User-Agent` header on every API call.** A request with no `User-Agent` is blocked at the edge with a `403` — before any auth or rate-limit check, so it looks nothing like a key or quota problem. Runtimes differ: Node.js 24.x sends the generic default `node`, others send nothing at all. Do not rely on the default — set your own value once in the shared fetch helper.
6. **Do not filter articles by the `published` field.** It is `false` for almost every article on this pull-based API, so filtering gives an empty blog.
7. **Never retry a 404 detail fetch.** Treat that article as permanently gone: skip it, never request the id again during the scan, and count it as resolved so `list_offset` still advances past its page (see Logic point 1). Five failed article requests in a minute temporarily blocks the key.
8. **Stay in scope.** No new dependencies, no tests, no redesign, no refactoring of existing code, no sample or placeholder articles. The only change outside the blog itself is one nav link.

## Step 1 — Detect the stack

- **TanStack Start** (`@tanstack/react-start`): server-rendered blog routes and a dynamic sitemap route.
- **React + Vite SPA** (React Router, no server): client routes and a static `public/sitemap.xml`. Lovable pre-renders these for crawlers, so SEO still works.

Use this project's own routing and data-fetching conventions for everything below.

## Step 2 — Store the API key as a backend secret

Enable Lovable Cloud if it is not already on.

Ask me for my BabyLoveGrowth API key using the secure secret input — not in chat — and store it as `BABYLOVEGROWTH_API_KEY`. Never print or log it.

If I do not have a key yet, tell me: *"app.babylovegrowth.ai → Settings → Publishing → API → Connect → Generate API Key."*

## Step 3 — Create the table

`blg_articles`:

| column | type |
| --- | --- |
| `id` | bigint, primary key — the BabyLoveGrowth article id |
| `slug` | text, unique, not null |
| `previous_slugs` | text[], default `{}` — old slugs, for redirects |
| `title` | text, not null |
| `meta_description` | text |
| `hero_image_url` | text |
| `language_code` | text |
| `content_html` | text |
| `json_ld` | jsonb |
| `faq_json_ld` | jsonb |
| `article_created_at` | timestamptz |
| `article_updated_at` | timestamptz — used for incremental sync |
| `synced_at` | timestamptz, default now() |

Enable RLS with exactly one policy: public `SELECT` (this is public blog content). No write policies — only the sync function writes, using the service role. Index `slug` and `article_created_at desc`.

Also create `blg_sync_state`, a single row (`id` int primary key, always 1) that lets a sync resume where the last one stopped and keeps overlapping runs from fighting each other: `list_offset` int default 0, `list_complete` boolean default false, `last_run_at` timestamptz, `lease_until` timestamptz, `next_allowed_at` timestamptz. RLS on, no policies at all — only the sync function touches it.

## Step 4 — Create the sync function

A backend/edge function `blg-sync` that pulls articles into `blg_articles`. It reads `BABYLOVEGROWTH_API_KEY` from the environment and writes with the service role key.

**API — use exactly this:**

- Base URL `https://api.babylovegrowth.ai/api/integrations`, headers `X-API-Key: <key>`, `Content-Type: application/json` and `User-Agent: <your-app-name>/1.0` (required — see rule 5).
- `GET /v1/articles?limit=50&offset=<list_offset>` → summaries, newest first, **no article body**: `id`, `title`, `slug`, `hero_image_url`, `languageCode`, `meta_description`, `created_at`, `updated_at`. `limit` max is 50; a short page means the end.
- `GET /v1/articles/{id}` → one article, adding `content_html`, `jsonLd`, `faqJsonLd`.
- `401` = bad key, `403` = blocked at the edge (almost always a missing `User-Agent`), `404` = unknown id, `429` = rate limited.

**Logic:**

0. **Take the lease first — before reading `list_offset`.** The hourly job can fire while a chained run is still going, and both would spend the same per-key rate-limit budget. Claim it in one atomic statement: `update blg_sync_state set lease_until = now() + interval '3 minutes' where id = 1 and (lease_until is null or lease_until < now()) returning *`. No row returned means another run holds it — return `{ skipped: "locked" }` immediately and do not chain. The run keeps renewing that 3-minute window as it works (point 3), so the short expiry only ever releases a dead run: release the lease (`lease_until = null`) in a `finally` block so a crash cannot wedge the sync for more than 3 minutes.
1. Resume the list scan from the stored `list_offset`, requesting 50 at a time. **Only advance `list_offset` past a page once every article on that page that needed a detail fetch has actually been stored, or was skipped as a permanent 404 (rule 7)** — if a budget cap (point 4) or a `429` cuts a page short, leave `list_offset` on that page so the next run re-lists it and finishes the leftovers instead of skipping them. A page with fewer than 50 items and no leftovers means the scan is complete: set `list_complete` true and reset `list_offset` to 0, so the next scheduled run starts a fresh scan.
2. An article needs a detail fetch only if it is new, or its `updated_at` is newer than the stored `article_updated_at`.
3. Fetch details one at a time, giving every API call a 15 s abort timeout so one hung request cannot stall the whole invocation. Before every API call, wait until the stored `next_allowed_at` has passed; immediately after each call, set `next_allowed_at = now() + 2100 ms` and persist it, **renewing `lease_until = now() + interval '3 minutes'` in that same statement**. A full budget of 25 calls, each able to wait 2.1 s and then hang for 15 s, runs far longer than three minutes, so without the renewal a slow run outlives its own lease and a second run starts writing the cursor underneath it. Keeping the gap in the database rather than a local variable means a fresh invocation cannot burst straight into the limit the previous one just hit.
4. **Budget every invocation:** at most 25 API calls in total (list pages and detail fetches combined) and at most 20 of them detail fetches. Stop when either cap is hit — the list scan resumes from `list_offset` next run. Return `{ synced, remaining, listComplete, done }`.
5. On `429`, stop the batch immediately and return current progress. Read the `Retry-After` response header (this API always sends it, in seconds) and store `next_allowed_at = now() + Retry-After`; if the header is missing, back off exponentially from 60 s, doubling per consecutive 429. **A run that saw a 429 must not chain**, even if it synced articles first — let the hourly job pick it up once the cooldown has passed.
6. Before storing `content_html`, clean it once, here, so the pages never have to: **strip every `<script type="application/ld+json">…</script>` block** (Step 8 renders corrected schema separately); **strip every `on*` event-handler attribute**; **drop any `href`/`src`/`xlink:href` using a `javascript:` or `data:` scheme**; **drop every `srcdoc` attribute and every `<object>`, `<embed>` and `<base>` element**; and **drop `<iframe>` elements whose `src` host is not youtube.com, youtube-nocookie.com or vimeo.com**, adding `sandbox="allow-scripts allow-same-origin allow-presentation"` to the ones you keep. Keep everything else exactly as-is, including the allowed embeds. Plain string/regex work is fine — do not add a sanitizer dependency.
7. Upsert on `id`. If the incoming `slug` differs from the stored one, append the old slug to `previous_slugs`.
8. **Self-chain:** accept an optional `chain` number in the body (default 0). When a run ends with work still outstanding — `remaining > 0` or the list scan unfinished — queue the next invocation with `EdgeRuntime.waitUntil(...)`, passing `chain + 1`. A bare unawaited `fetch` is killed when the function returns; `waitUntil` keeps the instance alive until it is sent. Release the lease **before** queueing, and have the continuation sleep until `next_allowed_at` before it starts. Do not chain when the scan is complete and `remaining` is 0, when `chain` reaches 25, when the run hit a 429, or when it made no progress. Scheduled runs start at `chain: 0`.

Running it twice in a row must be harmless.

## Step 5 — Run it once

Invoke `blg-sync` once; the chaining carries the rest. Wait about 30 seconds, confirm `blg_articles` has rows with non-empty `content_html`, then move on — the rest land in the background while you build the pages.

On `401` the key is wrong; ask me for it again. If the table is still empty after a clean run, my account has no articles yet — say so plainly rather than inventing placeholder content.

## Step 6 — Schedule it

Schedule `blg-sync` hourly with this project's scheduled-jobs mechanism (pg_cron + pg_net), under a fixed job name such as `blg-sync-hourly`. Unschedule any existing job of that name before creating it, so re-running this setup never leaves two jobs racing each other. Confirm exactly one job appears in Cloud → Jobs.

## Step 7 — Build the pages

Both read **only** from `blg_articles`.

**`/blog`** — **every row in the table**, whatever its `language_code`, newest first (`article_created_at desc`), as cards: hero image, title, `meta_description`, date. Link every post from this one page; no pagination, no language filtering. If the table holds more than one `language_code`, set each card's `lang` attribute accordingly and tell me in your report which languages are live. Give it a sane empty state.

**`/blog/:slug`** —

- Render `content_html` with `dangerouslySetInnerHTML`. This is trusted first-party content from my own account; do not run it through a sanitizer that strips `<iframe>`.
- `content_html` already opens with the article's `<h1>` and hero image. **Do not add your own `<h1>` or hero image above it.**
- Style it with this project's typography (a `prose`-style wrapper): headings, lists, tables, quotes, code and images all readable and responsive, images `max-width: 100%`.
- If the slug is not in `slug`, look it up in `previous_slugs` and redirect; only then 404.
- Add a "back to blog" link.

Add one "Blog" link to the site's existing header or footer nav, in the current nav style.

## Step 8 — SEO

Per post: unique `<title>` and `<meta name="description">` (`meta_description`); `<link rel="canonical">` to the post's live URL; Open Graph and Twitter card with `hero_image_url` and `og:type=article`; `lang` matching `language_code`; `json_ld` and `faq_json_ld` injected as `<script type="application/ld+json">`. Serialize with `JSON.stringify(data).replace(/</g, '\\u003c')` so a `</script>` sequence inside the data cannot break out of the tag. Skip a null block.

The stored schema was generated against my main website, so **every URL in it that refers to this article points at the wrong place — including nodes nested inside `@graph`.** Walk the whole structure and repoint them at the post's real live URL: the `Article` node's `url` and `mainEntityOfPage`, and the last `BreadcrumbList` item's `item`. Leave `author` and `publisher` URLs alone — those identify the brand, not this page. Do not add `url`/`mainEntityOfPage` at the top level next to `@graph`; they belong on the nodes.

The index needs its own title, description and canonical.

**Sitemap:** TanStack Start → a dynamic `/sitemap.xml` listing home, `/blog` and every post with `lastmod` from `article_updated_at`. Vite SPA → generate `public/sitemap.xml` now, and tell me in your final message to ask you to refresh it after new articles publish.

**robots.txt:** must exist, must not block `/blog`, and must carry a `Sitemap:` line holding the **full absolute URL** (`https://<site>/sitemap.xml`) — a relative path there is invalid and crawlers ignore it.

## Step 9 — Check before you finish

1. My key appears nowhere in frontend code, and `api.babylovegrowth.ai` appears **only** in the backend function.
2. `/blog` lists every row, and a post page renders styled HTML with exactly one `<h1>` and working images/embeds.
3. The post page's HTML source carries its unique title, meta description, canonical and JSON-LD — and no URL anywhere in that JSON-LD still points at my main website except `author` and `publisher`.
4. The scheduled job exists and is enabled.
5. Nothing else on the site changed except the nav link.

## Step 10 — Report back

In plain language: the blog URL and how many articles are live; whether the import is still catching up in the background (it needs nothing from me); how often new articles arrive; where the "Blog" link went; the sitemap caveat if this is an SPA; and anything left for me to do, such as publishing the site or submitting the sitemap in Google Search Console.
```

---

## [Option 2: Let us host your blog](#option-2-let-us-host-your-blog)

If you would rather not touch your Lovable project at all, we host the blog for you at `blog.yoursite.com`. You add one DNS record and we handle publishing, styling, server-side rendering, caching and the sitemap. A subdomain carries the same SEO value as your main domain.

[### View Blog Hosting Setup Guide](https://www.babylovegrowth.ai/docs/integrations/blog-hosting)

[WooCommerce Product Catalog

Connect your WooCommerce store and sync products into BabyLoveGrowth.](https://www.babylovegrowth.ai/docs/integrations/woocommerce-product-catalog)[Bolt.dev

Use Blog Hosting to add a blog to your Bolt.dev app with 1-click DNS setup.](https://www.babylovegrowth.ai/docs/integrations/bolt)
