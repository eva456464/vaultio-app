# 93 · Gap pass (second, read-only sweep of remaining dialogs, wizards and states)

Raw text: `raw/popovers/7*-*.json`, `8*-*.json`, `raw/popovers/wizard-<platform>.txt` (every wizard step's full text). Screenshots: `76-…88-*.png`, `wiz-<platform>-<step>.png` (steps that display the API key were deleted; their text is in the .txt with the key redacted).

## Content calendar — upcoming-topic actions
Hover buttons exist only on queued cards (no aria-label in DOM; icons `arrow-right-left`, `pencil`, `trash-2`).
- **Change topic** → dialog `Choose Alternative Topic` / `Choose among our topic recommendations or insert your own.`; search input `Search or insert your own topic (e.g. 'teeth whitening')`; table `Topic · Difficulty (colored pill: green low, amber mid) · Search Volume · Article Type (Automatic ⓘ)`, ~196 rows sorted by volume, row select highlight; footer `Cancel` / coral `Confirm`. Data `GET /content-plan/get-unused-clusters`. (`76-blog-change-topic-modal.png`)
- **Add instructions** → dialog `Article Instructions for <keyword>`: `Special Instructions` textarea (`0/1000`), `Reference URL` input, block `Add products to feature in articles – Connect Shopify, add products manually, or import a catalog so selected products can be linked in generated articles.` `Go to Product Catalog`; `Cancel` / `Save`. Data `GET /product-catalog/status` (if products exist, a product multi-select appears). (`77-…png`)
- **Add keywords** → `Add keywords` / `We'll group your keywords into article topics and schedule them on your calendar. Duplicate or off-topic keywords may be filtered out.` textarea + `Add keywords`. (`74-…png`)
- **Delete** — not clicked (destructive); i18n `dashboard.contentPlan` has its confirm copy.

## Publishing wizards (Settings > Publishing), steps until credentials are required
| Platform | Steps | Content |
|---|---|---|
| WordPress | 6 | 1 Before you start (☐ I have Administrator role…; install free plugin, paste one key, test article, ~3 min) → 2 `What's your WordPress URL?` (WORDPRESS SITE URL input, live validation `Looks good.`) → (plugin install, paste key, test publish, connected) |
| Shopify | 10 | 1 Before you start (☐ store owner / can create apps; ~10 min; "store, theme and products never touched") → 2 Find your store name (`.myshopify.com`, `Open my domain settings`, live check) → … custom app + Admin API token scopes |
| Wix | 6 | 1 Before you start (needs Wix Blog with ≥1 post; ☐ Blog app added, ☐ …) → 2 Find your Site ID (from `manage.wix.com/dashboard/<id>/home`) → … API key |
| Webflow | 7 | 1 Open your Webflow dashboard → token, collection mapping |
| Ghost | 5 | 1 Open your Ghost dashboard → Admin API key + URL |
| Snapps | 5 | 1 Open your Snapps dashboard → API key |
| BigCommerce | 6 | 1 Find your Store Hash (`store-<hash>.mybigcommerce.com`) → API account token |
| GoHighLevel | 7 | 1 Before you start (create a blog first) → 2 Create a Private Integration (Settings › Private Integrations › Create New Integration) → 3 Enable scopes `blogs/post.write`, `blogs/post-update.write`, `blogs/check-slug.readonly`, … → 4 Paste your access token (`pit-…`, shown once) |
| Duda | 5 | RSS-based: 1 Before you start → 2 Generate your RSS feed URL `https://api.babylovegrowth.ai/api/public/rss?domain=<domain>&limit=10&key=<API_KEY>` → 3 Add RSS Feed widget in Duda → 4 Import into Duda Blog → 5 You're all set (`RSS feed active`) |
| Framer | 6 | plugin from Framer Marketplace → 3 Get your API key → 4 connect plugin, collection name → 5 Build CMS pages → 6 connected |
| Lovable | 6 | 1 Before you start (Lovable keeps a copy, refreshes hourly) → 2 Get API key → 3 Copy prompt, paste into Lovable chat → 4 paste key into Lovable secret `BABYLOVEGROWTH_API_KEY` → 5 check /blog, publish → 6 connected |
| API (developer) | 7 | 1 developer integration ☐ → 2 Generate your API key (`Regenerate API Key`) → 3 Authenticate (two headers; Guide / `Copy for agent` tabs) → 4 Fetch articles (GET list, summaries) → 5 Paginate (`limit`, `offset`) → 6 Map fields to your CMS → 7 You're all set (`API key active`; pull-based) — see `docs/integrations-api.md` |
| Blog Hosting | 4 | 1 How blog hosting works (`blog.<domain>`) → **`Get started` = `POST /integrations/blog-hosting`** (creates hosted-blog record + Vercel domain) → 2 Add the DNS records: table NAME/TYPE/VALUE/STATUS: `_vercel TXT vc-domain-verify=blog.<domain>,<token>` and `blog CNAME <id>.vercel-dns-016.com.` (`NOT FOUND` until propagated), `Recheck`, `Waiting on DNS` → 3/4 verify + live. Hosted blog object: `{id, blogDomain, blogName, brandColor, brandLogoUrl, orgWebsiteId, isIntegrated, footerLinks}` |
| Webhook | 7? | not captured separately (card match fell through to the API wizard); see `docs/integrations-webhook.md` |
| Next.js | 6 | see `pages/20-settings.md` |
Header/footer of every wizard: `Back` link, `Step N of M`, progress dots, platform logo, `Important: This integration only allows us to publish blog posts to your site.`, `View detailed instructions ↗` (docs), `Chat with support`.

## Other dialogs / menus
- **Invite team member** (Members › `Add member`): `Invite team member` / `Invite a team member and adjust their role as needed.`; `Email`; `Role` (Admin / Member); `Website access` (checkbox per site with flag + language); `Admins have access to all websites.`; `Cancel` / `Invite`. (`78-…png`)
- **GA4 Manage**: dialog `Google Analytics 4` · `Connected as <email>` · `Disconnect account` · `Cancel` / `Close` (loads `GET /ga4/properties` → property picker). (`79-…png`)
- **Product catalog › Add manually**: 2-step dialog `Add products manually` (1 Choose method → 2 Add products): `One by one`, `Import file` (XML, CSV, Excel), `Google Shopping feed` (Merchant Center URL), `Facebook catalog feed`; `Cancel` / `Continue`. (`84-…png`)
- **Reddit opportunity ⋮ menu**: `Edit comment`, `Not relevant`. `Replied` tab → `GET /reddit/relevant-posts?page=1&limit=10&filter=commented`. (`85`, `86`)
- **Website selector › Add language** (`+` per site; aria `Add language`, recommended `Add language - Spanish`): dialog `Add Additional Languages` / `Select the languages you want to add and reach more people.` · `WEBSITE URL` · `SELECT LANGUAGES (n)` grid with flag, name, code `[ES]`, speaker count (`800 million`) for ~50 languages (Spanish, French, German, Czech, Romanian, Dutch, Portuguese (PT/BR), Italian, Polish, Slovak, Slovenian, Norwegian, Finnish, Swedish, Danish, Latvian, Estonian, Lithuanian, Greek, Chinese, …) → paid add-on checkout (`add-language-addition`). (`87-…png`)
- **Settings › Business › Your website setup**: `Blog path URL` (`https://yourwebsite.com/blog`), `Sitemap URL` + `View detected links`; target location with `Choose cities` checkbox (inline edit with round ✗ `Discard changes` / ✓ save buttons — edits are staged, not auto-saved).
- **Editor**: entering edit mode re-normalises content client-side (status flips to `● Unsaved changes`, counts recomputed) — nothing is saved until `Save & Close`; `Discard` leaves edit mode without a request. The AI text-selection menu did not appear via scripted selection; copy in `i18n/en-dashboard.json` (`articles` → assistant/rewrite keys).

## Auth pages (fetched as HTML, logged-out)
- White label `app.vaultio.co/en/sign-in`: minimal card `Sign in` · `Email` · `Password` · `Forgot password?` · `Sign In`. `sign-up`: `Sign up` · `Already have an account? Sign in` · `Sign Up with Email`. `reset-password`: `Reset Password` · `Email` · `Reset Password` · `Back to Sign In`.
- Babylovegrowth `/en/sign-in`: marketing nav + split layout (`5,000+ Companies`, `40% Avg. Growth`, `90 days To Traction`, Google 4.6/5) · `Log in` · `Continue with Google or enter your email` · `Continue with email` (magic link / code) · Terms & Privacy.
- Full auth copy: `i18n/en-auth.json`.

## Side effect during this pass (reported to owner)
- `Get started` in the Blog Hosting wizard executed `POST /api/integrations/blog-hosting`, creating hosted-blog record **id 6212** (`blog.vaultio.co`, `isIntegrated: false`, pending DNS). Not live (no DNS added); Next.js blog publishing unaffected. Left in place pending owner decision (removal would be another write: `deleteHostedBlog`).
- A staged (unsaved) location edit and an editor session were discarded; verified server data unchanged (`/locations` 15 sub-locations; article `updatedAt` unchanged).

## Still not covered (by design)
Stripe checkout/portal/cancel/pause flows, `Generate with AI`, `Draft a reply`, `Regenerate`, any Save/Confirm/Invite/Delete — copy for all of them is in `i18n/en-dashboard.json`; endpoints in `api/API-MAP-FROM-BUNDLE.md`.
