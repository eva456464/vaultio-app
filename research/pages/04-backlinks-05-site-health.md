# 04 · Backlinks exchange — `/:locale/dashboard/backlink-exchange`

Screenshots `04-backlinks-1..3.png`, `60-backlinks-how-credits-work.png`, `61-backlinks-show-more.png`; docs `docs/dashboard-backlinks.md`, `docs/other-nofollow-backlinks.md`, docs images `backlink*.png`. Data: `GET /backlinks`, `/backlinks/exchange-pool`, `/overview/achievements`, `/pages/articles-missing-in-sitemap`, `/subscriptions/get-org-website-subscription?type=backlink_credits`.

**Header:** H1 `Backlinks exchange`, sub `Grow your site authority by joining world's biggest backlink exchange network.` Right: toggle `Exchange on` (red switch = `backlinksEnabled`, PUT backlink-eligibility) and outlined `How do credits work?`.
**KPI row (4 cards):**
1. `Credits ⓘ` + small button `+ Add credits` (buy credit subscription) → big `382` / `backlink credits`.
2. `Backlinks received ⓘ` → `19` / `backlinks worth ≈ $4,300`.
3. `Backlinks given ⓘ` → `53` / `to partner sites`.
4. `Domain rating ⓘ` + `Powered by Ahrefs` → `42`, green `+14 since Jun 2026`, sparkline (green line).
**Backlink exchange pool card** (dismissable ×): `4,320 sites in your match range`; pill `● Your match range: DR 17–100`; histogram (bars per DR bucket 0–100 step 5, y = `# of links`, coral/red bars with gradient, the bar at your DR highlighted dark red with tooltip `Your domain rating = 42`); caption `You're matched with sites of similar domain rating since that's most natural to search engines. As your DR grows, you'll match with higher-authority sites.`
**Backlinks given** table (`Post articles → Give backlinks → Earn credits`): columns `Source article ⓘ` (your article title + external link), `Destination website ⓘ` (partner domain + external link), `Date ↓` (sortable). 5 rows then `Show more (48 more) ⌄`.
**Backlinks received** table (`Mentioned in other articles → Get backlinks → Spend credits`): `Source article ⓘ` (partner article title or URL), `Customer website ⓘ`, `Date`, `Credits used ⓘ` (e.g. `-28`, `—`). Pending rows show grey status `Awaiting partner publication`. `Show more (19 more)`.
**How do credits work? dialog:** `Backlink exchange explained` — 1. Initial 100 credits … 2. Earn credits (= your DR, max 25 per backlink) … 3. Spend credits (based on giver's DR; balance can go below zero) … `Where are backlink placed?` (contextual, within niche, dofollow).
**Backend:** network-wide matcher pairs sites by DR band and niche; when a partner's article is generated, an anchor link to your page is inserted (`backlinkExplanation` stored), credit ledger updated; crawler confirms `isBacklinkPresent`, `followType`, emails partner if nofollow (`nofollowEmailSentAt`); churned sites' links removed.

# 05 · Site health — `/:locale/dashboard/geo-audit`

Screenshots `05-site-health-1..2.png`, `62-site-health-what-we-check.png`, `63-site-health-choose-pages.png`, `64-site-health-share.png`, `65-site-health-how-to-fix.png`, `66-site-health-issue-expanded.png`, `67-site-health-by-page.png`; docs `docs/dashboard-technical-audit.md`. Data: `GET /geo-audit/data?orgWebsiteId=`, `/geo-audit/selectable-pages`, `/geo-audit/share-link`.

**Header:** H1 `Site health`, sub `Identifies issues that can block Google and ChatGPT from reading and ranking your site`. Right buttons: `☑ Choose pages`, `ⓘ What we check`, `↗ Share`.
**Health score card:** circular gauge `98` + green `● Good` (`Overall score`); three metric tiles with progress bars: `Page Speed 100/100`, `LLM Optimization 98/100`, `Technical SEO 98/100`. Row `Crawler files ⓘ` with chips `sitemap.xml ✓`, `robots.txt ✓`, `llms.txt ✓` (green checks; red when missing).
**Issues detected card:** `2 issue types on 10 pages`; right: `✦ How to fix the whole site` and black `↻ Next check in 3d 11h`. Segmented toggle `By issue` / `By page`. Issue rows (accordion): severity pill (`Medium` amber, `Low` grey), issue name (`Irrelevant meta description`, `Large image`), category (`Technical SEO`), count `4 pages ⌄` → expands to affected URLs + "How to fix". By page: list of pages with score + issue count.
**What we check dialog:** `Your homepage + up to 20 pages · Checked every 7 days · Last checked Oct 27, 2026`. Groups:
- *Crawler files (Whole site):* robots.txt missing · robots.txt blocks search engines · Sitemap missing · Sitemap can't be read · llms.txt missing · Not served over HTTPS.
- *Technical SEO (each page):* Missing page title · Title too long or short · More than one title tag · Same title on other pages · Title doesn't match the page · Missing meta description · Description too long or short · More than one description tag · Same description on other pages · Description doesn't match the page · No main heading (H1) · More than one H1 · No canonical tag · More than one canonical tag · Canonical points to another site · Broken links · Slow page · Images over 100 KB · Images without alt text · Weak alt text · Broken images · Unknown image format.
- *AI readiness (each page):* No structured data · Structured data needs fixing · Customer questions not answered.
**Choose pages dialog:** `Choose pages to audit` / `Pick up to 20 pages. We auto-fill the rest, homepage always included.` / `20 / 20 selected`; table `Include | Page` (checkbox, page title + URL). Save → PUT `/geo-audit/selected-pages`.
**Share dialog:** `Share site health check` / read-only public link `https://<app>/geo-audit/public/share/<token>` + `Copy link`, `The link always shows your latest audit results.`, `Preview link`, `Close`.
**How to fix the whole site dialog:** `We found 11 things to fix across 10 pages. Copy the text below and send it to your developer, or paste it into Claude, Cursor, Codex, or any other AI agent.` + generated plaintext checklist (`Technical SEO / GEO fixes for https://vaultio.co`, numbered pages, `Image large — LOW severity`, `How to fix:`, `Problem:`) + copy button.
**Backend:** weekly crawler (homepage + ≤20 selected pages): Lighthouse/PageSpeed, HTML checks, LLM checks (schema, FAQ coverage), robots/sitemap/llms.txt fetch; stores issues with severity & fix text; `validate-fix` re-checks one issue.
