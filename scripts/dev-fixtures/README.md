# Dev fixtures

Offline stand-ins used to test the agents without real client websites or publishing targets.
All credentials here are fake test values.

## Test client website (`testsite/`)

A small roofing-company site ("Sunny Roofing") with a sitemap, robots.txt (blocks GPTBot, so the
site health audit has an AI-crawler issue to find), service and blog pages, and some deliberate
SEO problems (a page without a meta description, no structured data, thin content).

```bash
python3 scripts/dev-fixtures/serve-testsite.py scripts/dev-fixtures/testsite 4100
```

To use it as a client, map the name to this machine (add `127.0.0.1 sunnyroofing.test` to
`/etc/hosts`), serve it on port 80 as well, and add the client as `http://sunnyroofing.test`
(the `http://` matters: the site has no HTTPS).

## Webhook and WordPress mocks (`mock-endpoints.py`)

```bash
python3 scripts/dev-fixtures/mock-endpoints.py 4200
```

```bash
python3 scripts/dev-fixtures/mock-endpoints.py 4300
```

| Integration | Settings → Publishing values |
|---|---|
| Webhook | URL `http://localhost:4200/hook`, bearer token `test-token-123` |
| WordPress | Site `http://localhost:4300`, user `editor`, application password `abcd abcd abcd abcd abcd abcd` |

Received payloads are logged to `/tmp/mock-endpoints.log`.

## Google mock (`mock-google.py`)

Stands in for Google's consent screen, token endpoint, Analytics Admin/Data APIs and Search
Console, with deterministic fake numbers for the test site (14 pages, AI referrals from ChatGPT,
Perplexity, Gemini, Copilot and Claude, Search Console data from March 2026).

```bash
python3 scripts/dev-fixtures/mock-google.py 4400
```

Then in `.env`: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set to any value, and
`GOOGLE_API_MOCK_URL=http://localhost:4400`. Settings → Analytics → Connect goes through the
mock's consent redirect; pick "sunnyroofing.test - GA4" and "sunnyroofing.test".

## Running the agents against it

```bash
npx tsx --tsconfig tsconfig.json scripts/test-agents.ts <siteId>
```

This runs onboarding, topic research, the article writer and the domain-rating check with
stand-in AI and keyword providers, so no API keys are needed.

Article improvements (needs Search Console data, e.g. from the Google mock, and a published article):

```bash
npx tsx --tsconfig tsconfig.json scripts/test-improvements.ts <siteId> [--publish]
```

## Reddit mock (`mock-reddit.py`)

Stands in for the Reddit Data API (application-only sign-in and `/api/info`) with fake thread
details; thread `rf0004` is archived so the agent should drop it.

```bash
python3 scripts/dev-fixtures/mock-reddit.py 4500
```

Use it with `REDDIT_CLIENT_ID=test REDDIT_CLIENT_SECRET=test REDDIT_AUTH_URL=http://localhost:4500
REDDIT_API_URL=http://localhost:4500`, then run the Socials agents with stand-in AI and Google
results:

```bash
npx tsx --tsconfig tsconfig.json scripts/test-socials.ts <siteId> --google
```

## Stripe mock (`mock-stripe.py`)

Stands in for Stripe: prices with lookup keys, customers, a local Checkout page ("Pay"),
subscriptions (price change, pause, cancel at period end), invoices, the customer portal, and
signed webhooks to the app.

```bash
STRIPE_WEBHOOK_SECRET=whsec_test APP_WEBHOOK_URL=http://localhost:3000/api/stripe/webhook python3 scripts/dev-fixtures/mock-stripe.py 4600
```

Run the app with `STRIPE_SECRET_KEY=sk_test_mock STRIPE_API_BASE=http://localhost:4600
STRIPE_WEBHOOK_SECRET=whsec_test`, then create the prices in the mock:

```bash
STRIPE_SECRET_KEY=sk_test_mock STRIPE_API_BASE=http://localhost:4600 npx tsx --tsconfig tsconfig.json scripts/stripe-setup.ts
```

`POST /test/renew/<sub_id>` bills the next period; `POST /test/fail/<sub_id>` makes it past due.

## Vercel and Resend domain mock (`mock-domains.py`)

Stands in for Vercel's project-domain API and Resend's domain and email APIs, for testing agency
domains and the emails sent from them.

```bash
python3 scripts/dev-fixtures/mock-domains.py 4700
```

Run the app with `VERCEL_TOKEN=test VERCEL_PROJECT_ID=prj_test VERCEL_API_BASE=http://localhost:4700
RESEND_API_KEY=re_test RESEND_API_BASE=http://localhost:4700`. Domains stay "Setup pending" until
`POST /test/dns/<domain>` (hosting) or `POST /test/email-dns/<domain>` (sending); sent emails are at
`GET /test/emails`. To open the app on an agency domain locally, map it in `/etc/hosts`.

## CMS mock (`mock-cms.py`)

Stands in for Ghost, Webflow, Shopify, Wix, BigCommerce (blog API and a WebDAV server with digest
authentication) and GoHighLevel with fake test credentials (listed at the top of the file) and
records every article it receives.

```bash
python3 scripts/dev-fixtures/mock-cms.py 4800
```

Run the app with `WEBFLOW_API_BASE=http://localhost:4800/webflow/v2
SHOPIFY_API_BASE=http://localhost:4800/shopify WIX_API_BASE=http://localhost:4800/wix
BIGCOMMERCE_API_BASE=http://localhost:4800/bigcommerce GOHIGHLEVEL_API_BASE=http://localhost:4800/ghl`;
connect Ghost with the site address `http://localhost:4800` and BigCommerce's WebDAV with
`http://localhost:4800/dav`. Received articles are at `GET /test/log`, WebDAV files at
`GET /test/files`. Posts are kept in memory, so after a restart republishing creates them again.

Framer, Lovable and Duda need no mock: they read the app's own content API and RSS feed. The
Framer plugin's sync can be run against the dev server with a stand-in Framer collection (create a
key in Settings → Publishing → Framer and pass it in the environment, not on screen):

```bash
cd integrations/framer-plugin && npm install && API_BASE=http://localhost:3000/api/integrations API_KEY=<key> npm test
```
To try the hosted blog, map e.g. `blog.sunnyroofing.test` to 127.0.0.1 in `/etc/hosts`, set it up
in Settings → Publishing (with the domain mock), then open `http://blog.sunnyroofing.test:3000/`.


## WordPress site with existing posts (`mock-wordpress.py`)

Stands in for a client's own WordPress site at `http://sunnyroofing.test`: the REST API (posts
list, a post in edit context, updates, new posts and media) and the live post pages, with posts
that weren't written by Vaultio: a block-editor post with images, a table, an embed, a styled
paragraph and a Yoast FAQ block (`wordpress/metal-roof-cost.html`), a classic-editor post with a
caption shortcode and a custom SEO title and description (`wordpress/flat-roof-leaks.html`), an
Elementor post, a post without Search Console data and the WordPress copy of Vaultio's article.
Every other path is served from `testsite/`, so it replaces `serve-testsite.py` on port 80. Posts
are kept in memory and reset on restart.

```bash
python3 scripts/dev-fixtures/mock-wordpress.py 80
```

Connect WordPress in Settings → Publishing with the site URL `http://sunnyroofing.test`, any
username and any application password of 16+ characters. Then, with the Google mock's Search
Console data synced:

```bash
npx tsx --tsconfig tsconfig.json scripts/test-wordpress-improvements.ts <siteId> --publish
```

## Store and product feed mock (`mock-store.py`)

Stands in for a client's online store: Shopify's GraphQL Admin API (products, including a draft and
an archived one), the WooCommerce REST API (with a variable product and a draft), Google Shopping and
Facebook feeds (`catalog/feed-google.xml`, `catalog/feed-facebook.xml`) and product photos.

```bash
python3 scripts/dev-fixtures/mock-store.py 4900
```

Run the app (and the worker, which syncs the catalog) with `SHOPIFY_API_BASE=http://localhost:4900`.
In Settings → Product catalog: Shopify with any store name, Client ID `catalog-client` and secret
`catalog-secret`; WooCommerce with store URL `http://localhost:4900`, key `ck_test_catalog` and
secret `cs_test_catalog` (`ck_writeonly` gives a key without Read access, a store URL ending in
`/redirect` redirects to www); feeds at `http://localhost:4900/feeds/google.xml` and `/feeds/facebook.xml`.
Files to import are in `catalog/` (`products.csv`, `products.xml`, `products.xlsx`). Then:

```bash
npx tsx --tsconfig tsconfig.json scripts/test-catalog.ts <siteId>
```

## Languages

With the Stripe mock running (and no prices needed), check language sites and plan coverage:

```bash
STRIPE_SECRET_KEY=sk_test_mock STRIPE_API_BASE=http://localhost:4600 npx tsx --tsconfig tsconfig.json scripts/test-languages.ts <primarySiteId>
```

The dashboard translation script can be tried without Claude:

```bash
npx tsx --tsconfig tsconfig.json scripts/translate-messages.ts fr --pseudo --out /tmp/messages
```

## Anthropic stand-in (`mock-anthropic.py`)

Answers the Messages API with canned replies so AI features can be clicked through without a
Claude key: structured answers are built from the request's JSON schema (the article editor's
fields get sensible text), streamed answers return a short sample article.

```bash
python3 scripts/dev-fixtures/mock-anthropic.py 4950
```

Run the app and the worker with `ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://localhost:4950`.
Requests are listed at `GET /test/log`. Articles written this way are placeholders, not real output.
