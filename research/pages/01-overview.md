# 01 · Overview (single-website mode)

- **Route:** `/:locale/dashboard/overview` (e.g. `/en/dashboard/overview`). Default landing page after login.
- **Title tag:** `Vaultio - Get Google and ChatGPT Traffic on Autopilot` (white label) / `BabyLoveGrowth - Get Google and ChatGPT Traffic on Autopilot` (original).
- **Purpose:** daily "what your AI agents did" feed + achievements + business profile summary + traffic summary.
- **Screenshots:** `screenshots/01-overview-1..3.png`, `53-overview-agents-running.png`, `54-overview-more-activities-expanded.png`, `55-overview-why-this-topic.png`, `56-overview-view-proof.png`, `57-overview-more-achievements.png` (shows a past day with "No article was planned" state + chip-style expanded activities), `58-overview-what-we-learned.png` (expanded), `59-overview-reporting-period.png`, `52-header-product-updates.png`.
- **Raw:** `raw/text/01-overview.txt`, `raw/describe/01-overview.json`, `raw/popovers/5*.json`, `raw/popovers/agent-activity-days.json` (text of all 127 days of the feed).
- **API:** `api/01-overview.json`, `api/01b-agent-activities-history.json`, `api/00-global.json`.

## App shell (shared by every dashboard page)
See `pages/00-app-shell.md` for the header / sidebar. Main content background is light grey (`#F9FAFB`-ish), cards are white with 1px light border and large radius (~24px).

## Layout top → bottom

### 1. Greeting band
`Good evening, Damian` (H1, ~28px, medium weight). Greeting varies with local time (Good morning / afternoon / evening) + user's first name (`users/me.name`). Sits on a light grey band with a bottom border.

### 2. Row: Agent activities card (≈2/3 width) + Achievement celebration card (≈1/3)

**Agent activities card**
- Eyebrow label `AGENT ACTIVITIES` (red/accent, uppercase, letter-spaced, ~13px).
- Title `What your agents did today` (when today) / `What your agents did` (other days). Sub: `10 activities` / `1 activity`.
- **Date navigator** (pill, border): `‹` (aria `Previous day`) · two-line label `Today` / `Oct 30, 2026` (or `Yesterday`, or weekday name e.g. `Wednesday`) · `›` (aria `Next day`). Previous disabled at first day (site creation date); next can go into future (up to `lastDate`, ~14 days ahead).
- **`Agents running` pill** (green dot + text + chevron) → popover **"Planned actions"**: `50 actions over the next 14 days`, grouped by day header `TOMORROW · OCT 31`, `SUNDAY · NOV 1` …, items like:
  - `Will sync your sitemap` (daily) · `Will check your traffic` (daily) · `Will check your AI traffic` (daily)
  - `Will check your Google rankings` (every 3 days) · `Will check if AI recommends you` (weekly, Mon) · `Will scan your site for issues` (weekly, Tue) · `Will check your domain rating` (periodic, e.g. monthly)
  - (This popover is built from future days of `GET /api/overview/agent-activities?date=…` — the client fetches `date=<tomorrow>` and `date=<+14d>`.)
- **Featured article block** (bordered inner card) – first item of the day:
  - Row: file icon in grey circle + `Agent wrote and published a new article` (or `Agent has written this day's article` for future/unpublished).
  - Thumbnail (cover image, ~230×130, rounded 12px) + title (18px semibold) + `Target keyword:` grey label + keyword value.
  - Pills: green `● Live ↗` (links to `publishedUrl`) and `💡 Why this topic?` (opens popover/dialog: title, `Target keyword: … 320 searches/mo`, then three collapsible sections `Why this topic?` (3 bullets from `whyThisTopic[]`), `Why this structure?`, `Article characteristics` — the latter two come from `GET /api/articles/:id` `generationRationale`).
  - Empty state for a day without article: doc+calendar illustration, `No article was planned for this day`, `Your agents write articles on the days in your content plan.`, button `Open content plan →` (→ `/dashboard/content-plan`).
- **Activity rows** (icon in rounded grey square + sentence). First 2–3 shown fully, rest collapsed behind `Agent did 7 more activities` (search icon, chevron). Expanded rows render as small chips with icons, connected by a tree line (see screenshot 57).
- **Activity copy templates** (`{N}` = number; first rows prefixed with "Agent", chips without):

| API `type` | Display copy | Fields used |
|---|---|---|
| articlePublished | `Agent wrote and published a new article` / chip `Agent wrote and published: {title}` | title, articleId, publishedUrl |
| topicResearched | `Agent researched tomorrow's article topic: {keyword}` | title |
| topicsPlanned | `Agent added {N} topics to your content plan` | count |
| cannibalizationCheck | `Agent checked you don't already rank for {N} upcoming topic(s)` | count |
| backlinkReceived | `Agent got you a backlink from {domain} (DR {dr})` / grouped `Agent got you {N} quality backlinks` | sourceUrl, domainRating |
| socialPostPublished | `Agent shared your article on Facebook` / `…on Instagram` | title (= network), sourceUrl (post URL) |
| siteHealthAudit | `Agent found {N} technical issues on your site` | count, total |
| aiVisibilityCheck | `Agent asked AI {N} questions: {M} mentions` / `…: no mentions yet` | count (questions), total (mentions) |
| analyticsSync | `Checked your traffic: {N} visitors last week` | count |
| aiTrafficReport | `Checked AI traffic: {N} visitor last week` / `Checked AI traffic: no visitors yet` | count |
| rankingsCheck | `Agent checked Google: {N} clicks last week` | count, total |
| domainRatingCheck | `Agent checked your domain rating: {N}` | domainRating |
| sitemapSync | `Synced your sitemap: {N} pages` | count |
| competitorGapScan | `Scanned {N} competitors for content gaps` | count |
| backlinkExchangeEnrolled | `Agent added you to the backlink exchange` | – |
| websiteAnalyzed | `Built your brand profile` (onboarding day) | – |
| competitorsFound | `Found {N} competitors` | count |
| keywordResearch | `Found {N} keywords` | count |
| promptsGenerated | `Wrote {N} questions customers ask AI` | count |
| firstMonthPlanned | `Planned {N} articles for your first month` | count |

Empty day: `No activities yet`.

**Achievement celebration card** (right; stacked-cards look with 2 offset cards behind)
- Background: soft mint/green radial gradient (white → `#E8F7EE`), confetti dots in many colors, big 3D green coin with `$` icon (icon varies by category: shield, coin, chart…).
- Top-left chip `+6 more achievements` (cycles through unseen achievements), top-right `×` (aria `Dismiss`; marks achievements seen — a write, not clicked).
- `CONGRATULATIONS!` (green, uppercase, letter-spaced), title `$2,500 in backlink value` (26px semibold), `New achievement unlocked`, link `View proof` (green).
- **View proof** dialog: title, `Unlocked on Oct 12, 2026`, explanation (`What the backlinks you got through BLG would cost to buy on backlink marketplaces, priced by each linking site's domain rating. You got them for free.` — NOTE: says "BLG" even in white label), list of rows `https://bigeyedeers.co.uk` / `DR 44 · Oct 12, 2026 · Worth $250`.
- Source: `GET /api/overview/milestones` → `unseen[]`.

### 3. ORGANIC WINS — "Your website's achievements"
Horizontal carousel of badge cards (prev/next buttons aria `Previous achievements` / `Next achievements`). Each card: 3D colored badge illustration (shield/coin/chart/hex), optional red `NEW` tag (top-left), title, green delta (`+5 in last 7 days`), grey `Next milestone: 20` or `Top tier reached`. Clicking a card opens the same proof dialog.

Categories (from `cards[].category`) and display:
`backlinks` (`10 backlinks earned`), `backlinks_value` (`$2,500 in backlink value`), `total_clicks` (`1 organic click`), `total_impressions` (`5K impressions`), `ai_referral_first` (`10 visitors from AI search`), `ai_visitors_chatgpt|perplexity|gemini` (`10 visitors from ChatGPT`), `ai_mentions` (`1 AI mention`), `ai_mention_chatgpt|claude` (`Mentioned by ChatGPT` → `Top tier reached`), `ai_citations` (`10 AI citations`), `ai_cited_blg_article` (`1 of our articles cited by AI`), `dr_badge` (`Domain rating 40`), `dr_gain` (`Domain rating +10`), `articles_indexed` (`50 articles on Google`), `article_clicks` (`1 click on one article`), `article_impressions` (`1.4K impressions on one article`), `keywords_top3|top10|top20|top30` (`10 keywords in Google's Top 10`).
Thresholds ladder examples: backlinks 10→20, value $2,500→$5,000, impressions 5K→6K, DR 40→50, keywords top20 50→100.
Proof kinds: `backlinks`, `backlinks_value`, `search_traffic`, `ai_visits` (+provider), `ai_mentions`, `ai_citations`, `domain_rating` (rating/startRating/reachedOn), `indexed_articles`, `keywords` (band, query, article).

### 4. WHAT WE LEARNED — "Here's what we learned about Vaultio"
Sub `We use this to plan and write every article for you.` Site logo + domain + `Marketing · B2B Services` (industry · business type).
Sections: `What you do` (paragraph = positioning), `What you offer` (chips `Vaultio System · from USD 449 / month`, `+1 more`), `Who you serve` (chips from targetAudience, `+16 more`), `Where you sell` (`United States · English`), `Brand colors` (swatch chips `#E94545`, `#000000`), `Competitors` (domain chips, `+5 more`).
Footer: `Show everything we learned ⌄` / `Show less ⌃` (red link), buttons `Not quite right, update ↗` (→ Settings > Business details) and black `Looks good` (confirms — write; not clicked).
Data: `GET /api/organization/get-org-website`, `GET /api/organization/business-profile`, `GET /api/competitor`.

### 5. TRAFFIC SOURCES — "Where your traffic comes from"
Sub `Compare which channels drive the most traffic to your site`. Controls: `📅 Last 90 days ⌄` (aria `Reporting period`; options `Last 1 day, Last 7 days, Last 30 days, Last 90 days, Last 12 months, All time`) and `Site traffic ↗` link (→ `/dashboard/analytics/ga4`).
Left: multi-line chart (Recharts) series Direct (orange), Other (teal), Organic Search (blue), AI Search (purple), Paid (green); legend as pills. Right: `Channel Breakdown` table `Channel | Active Users ↓ | Share` (`Direct 1,230 72.2%`…).
Data: `GET /api/ga4/channel-timeseries?range=90d`, `GET /api/ga4/channel-breakdown?range=90d` (range values: `1d,7d,30d,90d,12m,all`). API names channels `Organic search`, `LLM referrers` → UI relabels `Organic Search`, `AI Search`.

## API calls on this page
| Call | Purpose |
|---|---|
| `GET /api/overview/agent-activities?tz=America/Los_Angeles[&date=YYYY-MM-DD]` | Returns `{timeZone, firstDate, lastDate, selectedDate, days:[{date,isToday,count,featuredArticle{articleId,contentPlanId,title,articleType,keyword,searchVolume,keywordDifficulty,imageUrl,whyThisTopic[],publishedUrl,status},items[{type,date,…}]}]}` — window of ~8 days around `date`; client pages within it, refetches when leaving window |
| `GET /api/overview/milestones` | `{cards[{id,category,threshold,achievedAt,seenAt,proof,value,gainLast7Days,nextThreshold}], unseen[], gscProperty}` |
| `GET /api/overview/setup-checklist` | `{items:[{key:"connect_website"|"connect_gsc"|"connect_ga4"|"connect_instagram"|"watch_walkthrough"|"read_docs", isDone}]}` (checklist card only shown while incomplete) |
| `GET /api/organization/business-profile` | servicesOffered[], positioning, businessType |
| `GET /api/competitor` | competitor list |
| `GET /api/content-plan` | used for featured article / why-this-topic |
| `GET /api/articles/:id` | rationale for "Why this structure?" |
| `GET /api/ga4/status`, `/api/ga4/channel-timeseries`, `/api/ga4/channel-breakdown`, `/api/gsc/metrics/timeseries?period=3m` | traffic section |
| `GET /api/meta-posting/feature-status`, `/api/gbp/availability` | feature gating |

## Inferred backend jobs (from activity types + "Planned actions")
- **Daily:** sitemap sync (counts pages), GA4 sync (weekly visitors), AI-referral traffic report, topic research for tomorrow's article, cannibalization check of upcoming topic(s) against GSC, article generation + publish (articles "generated everyday before 11AM UTC"), social carousel post to FB/IG after publish, backlink exchange placements.
- **Every ~3 days:** Google rankings check (GSC queries, clicks last week, keywords per band).
- **Weekly:** AI visibility check (ask LLMs N prompts, count mentions), site health crawl (issues found), competitor content-gap scan, topic planning (`topicsPlanned`).
- **Periodic:** domain rating check (Ahrefs-like DR).
- **Onboarding (one-off):** website analysis/brand profile, competitor discovery (10), keyword research (~1.5K keywords), AI prompt generation (10), first-month plan (31 articles), backlink exchange enrollment.
- **Milestones engine:** recompute achievement values after each sync; create `achievedAt` when threshold crossed; `unseen` until dismissed.
