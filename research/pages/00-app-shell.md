# 00 · App shell (header, sidebar, modes, global data)

Screenshots: any page (e.g. `01-overview-1.png`), `50-header-website-selector.png` (agency mode), `50b-header-website-selector-dashboard.png` (site mode, with language upsell), `51-header-avatar-menu.png`, `52-header-product-updates.png`, `80-mobile-overview.png`, `81-mobile-menu-open.png`.

## Routes / modes
- Locale prefix on every route: `/:locale/...` (`en, fr, nl, de, es, pt, it`; `NEXT_LOCALE` cookie).
- **Site mode** (`/:locale/dashboard/*`): one OrgWebsite selected (cookie `org_website_id`, header `x-org-website-id`).
- **Agency mode** (`/:locale/clients/*`): "Manage clients" — portfolio of sites, invoices, agency settings. Selector shows a people icon + `Manage clients`.
- Auth routes: `/sign-in`, `/sign-up`, `/reset-password`, `/change-password`, `/email-confirmed`, `/callback`. Onboarding: `/onboarding/*` (see `92-onboarding.md`).
- Internal staff: `/blg-admin/*` (not part of the product; not visited).

## Header (white bar, ≈76px, bottom border)
Left → right:
1. **Logo** (40px square; white label shows agency favicon/logo from whitelabel config; BLG shows the `BabyLoveGrowth.ai` wordmark `logos/logoBlack.svg`). Links to overview.
2. **Website selector** (button, 10px radius, border): tiny uppercase label `WEBSITE` + current site domain (or `Manage clients`), left icon = circular flag of site language (or people icon), chevron. Dropdown (Radix popover, ≈240px):
   - One row per site: domain + flag + small round `+` (add language). The current site row is highlighted (peach background) and may show a **language upsell** chip `+ Recommended Spanish 🇪🇸` (from `/organization/language-upsell` + `/subscriptions/language-addition-eligibility`).
   - Divider, `+ Add client` (→ add-website / onboarding flow; agency) and `👥 Manage clients →` (→ `/clients`).
   - Selecting a site sets cookie `org_website_id` and reloads site-scoped queries (stays on same route).
3. Right: **Bell** (aria `Product updates`, 36px grey circle) → popover "Product Updates" (list of `Launched` + date + title + paragraph; `Request a feature` link). BLG also has a full page `/dashboard/product-updates` with `Try it now` links and a "Have an idea? Request a feature" card; in the white label that route redirects to overview. BLG header also shows a **book icon** (docs link) — absent in white label.
4. Agency mode: avatar circle with initials (`DK`) → menu with only `Log out`.

## Sidebar (248px)
Site mode, white label (top → bottom):
```
▣ Overview                       (lucide layout-grid)
🗎 Blog content                  (file-text)           → /dashboard/content-plan
🔗 Backlinks                     (link)                → /dashboard/backlink-exchange
♡ Site health                    (heart-pulse)         → /dashboard/geo-audit
💬 Socials  ›                    (message-square)      group
     Reddit                                            → /dashboard/socials?tab=reddit
     Quora                                             → /dashboard/socials?tab=quora
🗎 Reporting                     (file-chart)          → /dashboard/reporting
──────── ANALYTICS
✦ AI visibility ›                (sparkles)            group
     Overview                                          → /dashboard/ai-visibility
     Prompts                                           → /dashboard/ai-visibility?tab=prompts
     Brands mentioned                                  → ?tab=brands-mentioned
     Sources                                           → ?tab=sources
📊 Site traffic ›                (chart-column)        group
     All traffic                                       → /dashboard/analytics/ga4
     AI search traffic                                 → /dashboard/analytics/ai-traffic
     Google traffic                                    → /dashboard/analytics/google-traffic
────────
⚙ Settings                                            → /dashboard/settings/account
...
Sidebar  [▣][◧]   (footer: expanded / collapsed (icon-only) toggles)
```
- Groups are an accordion (one open at a time); children have a vertical guide line. Active item: grey bg `#F3F4F5`, 10px radius, plus a dark 3px indicator bar at the far left edge.
- **BLG-only differences:** Socials also has `Instagram & Facebook` (→ `?tab=meta`) and `Google Business` with a `Soon` badge; a rotating promo card above the footer (G2 review $50, LinkedIn post $20, Yearly plan save 40%) with dot pager + `Next ›`; Intercom chat bubble bottom-right.
- Agency mode sidebar: label `CLIENT MANAGEMENT`; `Clients`, `Invoices`, `Settings` (→ `/clients/settings/profile`).

## Mobile (<768px)
Header: hamburger (`Menu`), logo, bell, gear. Menu = full-screen sheet: close ×, logo, bell, gear, full-width website selector, nav grouped **ACTIONS / ANALYTICS / OTHER**.

## Global data loaded on every page
`GET /users/me`, `/organization`, `/organization/get-org-websites`, `/organization/get-org-website`, `/onboarding/status`, `/integrations`, `/async-jobs`, `/locations`, `/achievement/trustpilot/status`, `/subscriptions/get-org-website-subscription?type=main|llm_visibility_prompts|reddit_autopilot|quora|reddit|backlink_credits`, `/reditus/auth-token`, `/gbp/availability`, `/meta-posting/feature-status`, `/organization/language-upsell`, `/subscriptions/language-addition-eligibility`, `/seo-specialist/balance`.
Route guard: if `onboarding/status` ≠ completed → onboarding; onboarding routes redirect away when completed (to `/clients` in agency orgs).

## Floating "Customize future articles" toast
On article pages: bottom-center card with red sliders icon, title `Customize future articles`, text `Adjust the format, tone, length, images and more for the articles we generate.`, red button `Open settings` (→ Settings > Writing), dismiss ×.
