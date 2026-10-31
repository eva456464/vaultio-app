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
