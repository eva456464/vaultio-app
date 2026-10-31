# Babylovegrowth / Vaultio dashboard — rebuild research

Captured 2026-10-30 from the owner's logged-in Safari (read-only), on both `https://www.babylovegrowth.ai/en/dashboard` (original) and `https://app.vaultio.co` (the same app white-labelled as **Vaultio** — use this as the visual reference). Secrets (JWTs, API keys, OAuth tokens, share tokens) are redacted as `[REDACTED]`.

## Start here
1. `pages/00-app-shell.md` — header, sidebar, modes, routing, global data.
2. `pages/01-overview.md` → `02-blog-content.md` → `04-backlinks-05-site-health.md` → `06-socials-08-reporting.md` → `09-ai-visibility-13-traffic.md` → `20-settings.md` → `40-agency-mode.md` → `92-onboarding.md` → `93-gap-pass.md` (second sweep: topic dialogs, all publishing wizards, invite/GA4/catalog/language dialogs, auth pages) → `90-differences-blg-vs-vaultio-and-sites.md`.
3. `api/ENDPOINTS.md` (consolidated API + inferred background jobs), `data-model.md`, `design-tokens.md`, `public-site.md` (plans, limits, integrations).
4. `i18n/en-dashboard.json`, `i18n/en-onboarding.json`, `i18n/en-auth.json` — **the app's own English UI string catalog** (every label, empty state, tooltip, error message), extracted from the public guest-onboarding page payload. `i18n/en-messages.full.json` = entire catalog incl. marketing site.
5. `docs/` — all 39 public documentation pages as markdown + `docs/img/` (88 images, mostly real dashboard screenshots) — explains how each feature works behind the scenes.

## Folder map
| Path | What |
|---|---|
| `pages/*.md` | Hand-written page specs (layout, copy, controls, data, behaviour, backend) |
| `pages/*.auto.md` | Auto-generated raw dossier per captured page: full visible text, every button/link (with lucide icon names + hrefs), every form control (label/value), tables, images, and every API call with response shape |
| `api/<page>.json` | Redacted captured requests/responses per page (real example data) |
| `api/ENDPOINTS.generated.md` | All 80 observed endpoints with query params + response shapes |
| `api/API-MAP-FROM-BUNDLE.md` | Complete endpoint constant map from the JS bundle (~300 routes incl. writes) |
| `api/API-SERVICES-FROM-BUNDLE.md` | Client service functions → HTTP method → URL expression |
| `api/agency-reporting-preview.html` | The real rendered client-report HTML (A4 PDF template) |
| `screenshots/` | Retina window screenshots (`NN-slug-n.png`; scrolled pages have -1..-n). `G*` = second site (goletapressurewashing.com), `B*` = original BLG domain |
| `raw/text/`, `raw/describe/`, `raw/popovers/` | Raw page text, structural JSON, opened popovers/dialogs/wizards (text + API) |
| `raw/tokens-overview.json`, `raw/css-vars.txt` | Computed styles + all CSS custom properties |
| `raw/public-*.txt` | Public site page texts (pricing, home, whitelabel, backlinks, ai-visibility) |

## Sitemap (all app routes, from the Next.js route manifest; `:locale` = en|fr|nl|de|es|pt|it)
**Site dashboard** — status: ✅ captured (text + screenshots + API), 🔁 redirects in this account, 📄 docs/i18n only
- ✅ `/dashboard/overview`
- ✅ `/dashboard/content-plan` (Content Calendar) · ✅ `/dashboard/content-plan/improvements` (empty state) · 📄 `/dashboard/content-plan/improvements/:id`
- ✅ `/dashboard/articles/:id` (reading view + editor mode)
- ✅ `/dashboard/backlink-exchange`
- ✅ `/dashboard/geo-audit` (Site health)
- ✅ `/dashboard/socials?tab=reddit` · ✅ `?tab=quora` · ✅ `?tab=meta` (BLG domain only)
- ✅ `/dashboard/reporting`
- ✅ `/dashboard/ai-visibility` (+ `?tab=prompts|brands-mentioned|sources`) · ✅ `/dashboard/ai-visibility/:promptId`
- ✅ `/dashboard/analytics/ga4` · ✅ `/analytics/ai-traffic` · ✅ `/analytics/google-traffic`
- ✅ `/dashboard/seo-specialist` (BLG only; 🔁 in WL) · ✅ `/dashboard/product-updates` (BLG only; 🔁 in WL; bell popover in both)
- Settings ✅: `account, team-members, billing, white-label, business, branding, competitors, product-catalog, saved-pages, writing, visual, schedule, improvements, publishing (+ inline wizards), analytics, reddit, quora`; ✅ `meta`, `referrals` (BLG domain); 🔁 `gbp` (feature "Soon")
**Agency** — ✅ `/clients`, `/clients/invoices`, `/clients/settings/profile|branding|hosting|members|talk-with-team`; ✅ Add client dialog (first screen)
**Onboarding** — 📄 `/onboarding/*`, `/onboarding/guest/*`, `/onboarding/agency*` (redirect when already onboarded; copy from i18n — see `pages/92-onboarding.md`)
**Auth** — 📄 `/sign-in`, `/sign-up`, `/reset-password`, `/change-password`, `/email-confirmed`, `/callback` (not visited — would require logging out; copy in `i18n/en-auth.json`)
**Public/other** — `/geo-audit/public/share/:token` (public audit share), marketing pages, `/blg-admin/*` (BLG staff admin — not product, not visited)

## Coverage notes / what could not be covered
- **Read-only rule respected:** nothing was saved, published, generated, connected, deleted or submitted. The only non-GET calls observed were made by pages themselves on load (e.g. `POST /agency-reporting/preview` renders the report preview; analytics pixels).
- **Write endpoints** were therefore not observed live; they are documented from the JS bundle (`API-MAP-FROM-BUNDLE.md`, `API-SERVICES-FROM-BUNDLE.md`) — request body shapes for writes are mostly inferred.
- **Second sweep (`pages/93-gap-pass.md`)** covered Change topic, Add instructions, Add keywords, all publishing wizards (until credentials), invite member, GA4 manage, product catalog add, add-language, Reddit menus, auth pages. **Still deliberately not opened:** Delete confirmations, billing Pause/Cancel flows, Stripe checkout/portal, `Generate with AI`, `Draft a reply`, AI rewrite menu — copy for all is in `i18n/en-dashboard.json`.
- **Side effect:** the Blog Hosting wizard's `Get started` created a pending hosted-blog record (id 6212, `blog.vaultio.co`, not live). Reported to the owner.
- **Improvements detail** — no improvements exist yet (empty state captured).
- **Google Business Profile** — feature gated ("Soon"); only i18n/API map.
- **Mobile** — captured at 430px (menu sheet) + breakpoint checks at 768/1024/1280.
- Response bodies are truncated at 100 KB (e.g. `/content-plan`, `/articles` lists) — shapes are complete.
- The owner's site selector was switched to goletapressurewashing.com for comparison and **switched back to vaultio.co** afterwards.

## Stack summary (details in `api/ENDPOINTS.md`)
Next.js App Router + Tailwind v4 + Radix/shadcn + lucide + Recharts + TipTap · REST API `api.babylovegrowth.ai` (axios, `Authorization: Bearer` JWT, `x-org-website-id`) · Supabase Auth + Storage · Stripe · Resend · Vercel domains · Google OAuth (GSC/GA4) · Meta Graph · Ahrefs DR · LLM providers (OpenAI/Anthropic/Google) · PostHog (proxied `/ingest`), Sentry, Intercom (BLG only), GTM + ad pixels, Rewardful/Reditus/Tremendous.
