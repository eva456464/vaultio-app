# 90 · Differences: Babylovegrowth (original) vs Vaultio (white label), and site 1 vs site 2

Same Next.js build and same backend (`api.babylovegrowth.ai`) on both domains; differences are driven by the white-label config and feature flags.

## BLG `www.babylovegrowth.ai` vs white label `app.vaultio.co`
| Area | Babylovegrowth | Vaultio white label |
|---|---|---|
| Title tag | `BabyLoveGrowth - Get Google and ChatGPT Traffic on Autopilot` | `Vaultio - Get Google and ChatGPT Traffic on Autopilot` |
| Logo / favicon | `BabyLoveGrowth.ai` wordmark (`/logos/logoBlack.svg`) | Vaultio mark from Supabase `whitelabel/vaultio/vaultio_favicon.png` (square icon only) |
| Accent color | `--brand-accent` default `#E8541E` (orange-red) | `#E94545` (whitelabel `primaryColor`) — eyebrows, NEW tags, CTAs |
| Header right | bell + **book/docs icon** | bell only |
| Sidebar promo card | rotating card above footer: G2 Review "Get $50 Discount" / LinkedIn Post "Get $20 Discount" / Yearly Plan "Save 40%" | none |
| Support chat | Intercom bubble (bottom-right) | none |
| Socials children | Reddit, Quora, **Instagram & Facebook**, **Google Business `Soon`** | Reddit, Quora only |
| `/dashboard/settings/meta` | IG/FB posting settings page | redirects to overview |
| `/dashboard/settings/referrals` (Refer and earn) | present | not in nav (route not tested directly in WL) |
| `/dashboard/seo-specialist` | "Work with an SEO specialist" page | redirects to overview |
| `/dashboard/product-updates` page | full page | redirects; bell popover still shows the same product updates |
| `/dashboard/settings/gbp` | redirects (feature not live) | redirects |
| Upsells | Upgrade/Scale promos, G2/LinkedIn/Trustpilot rewards | language upsell + Reddit+/Quora+/prompt packs still shown |
| Brand leaks in WL | — | Some strings still say **"BLG"**: achievement proof ("backlinks you got through BLG"), Writing settings ("structural elements BLG adds"), Product updates text; API key env var `BABYLOVEGROWTH_BLOG_API_KEY`, npm package `babylovegrowth-next-js-blog`, share link host `www.babylovegrowth.ai/geo-audit/public/share/...` — the rebuild should brand all of these. |
| Activity texts / pills | identical (`Live`, `Agents running`, etc.) | identical |

## vaultio.co (41420) vs goletapressurewashing.com (51141)
Screenshots `G*-goleta-*.png`, dossiers `pages/G*.auto.md`.
- Overview today: `Agent wrote a new article` (not yet "published" — article generated, `publishedUrl` null, publishing via Next.js Blog/ISR shows later) with `10 searches/mo` shown next to keyword; vaultio shows `Agent wrote and published a new article` + `Live` pill.
- Achievements: Goleta has `+12 more achievements` and extra categories `$100 saved on Google Ads` (ad-spend-saved category), `50 organic clicks`, `20 articles on Google`, `10 clicks on one article`, `Domain rating 10`, `Domain rating +15` — confirms the milestone ladder is generic per site.
- Brand color `#0B3050` (navy) vs `#E94545`; Goleta site logo in client list.
- Publishing: both show `Next.js Blog — Connected` (+ `API — Connected`).
- Billing: Goleta `Grow`, `$99.00 on Nov 4`, own invoice history (separate Stripe subscription per site).
- Otherwise identical page structures; all data is per-site (`x-org-website-id`).
- Account also has two hidden duplicate `vaultio.co` sites (30098, 30923, `onboardingStatus: not_started`) — leftovers from abandoned onboarding; the UI hides them.
