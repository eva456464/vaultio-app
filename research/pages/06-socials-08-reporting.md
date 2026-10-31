# 06 · Socials — `/:locale/dashboard/socials?tab=reddit|quora|meta`

Screenshots: `06-socials-reddit-1..3.png`, `07-socials-quora-1..3.png`, `B06-blg-socials-*.png`, `B07-blg-socials-instagram-facebook-*.png`, `G06-goleta-socials-*.png`. Docs: `docs/dashboard-reddit.md`, `docs/dashboard-quora.md`, `docs/dashboard-meta-posting.md`.

## Reddit tab
Header: Reddit logo (orange circle) + H1 `Reddit`, sub `Comment on the Reddit threads ChatGPT, Gemini and Claude learn from, so they recommend Vaultio.` Right: `⚙ Manage keywords` (→ Settings > Reddit).
Segmented tabs `To reply` / `Replied` (filter). Feed of opportunity cards:
- `r/localseo` (subreddit, with Reddit icon), post title (bold), upvote count `0 ⇧`.
- Either **SUGGESTED REPLY** box (✦ icon, grey bg, AI-written comment mentioning the brand naturally) + black `Copy & open →` (copies text, opens thread), or black `✦ Draft a reply` button (generates suggestion on demand).
- Kebab `⋮` menu (mark as replied / discard).
- Footer `🔍 Found for "best seo for home service businesses"` (monitored keyword).
- Pagination `Showing 1-9 of N` + page numbers.
Right column upsell card (dismissable): illustration, `Find more Reddit opportunities`, `Get more people and LLM models to discover your brand.`, ✓ `Track 8× more keywords`, ✓ `Get daily opportunities`, red `Upgrade to Reddit+`.
Data: `GET /reddit/configuration`, `/reddit/subreddits`, `/reddit/relevant-posts?page=1&limit=100&filter=all` (scores: opportunityScore, llmRelevanceScore, engagementScore, recencyScore, reasoning, suggestedComment).

## Quora tab
Same layout: `Quora` / `Answer the Quora questions ChatGPT, Gemini and Claude learn from, so they cite Vaultio.`; cards `Quora` + question + `Draft a reply` + `Found for "…"`; `Showing 1-10 of 27 Quora opportunities` with pages 1 2 3. Right upsell: sample Quora card (`Quora · Fashion`, question, views/answers, AI logos ChatGPT/Gemini/Claude), `Personalized Quora questions from your articles`, `Track 8× more keywords`, `Get daily opportunities`, `Upgrade to Quora+`. Data: `/quora/configuration`, `/quora/relevant-posts`.

## Instagram & Facebook tab (BLG only in this account; hidden in white label)
`Instagram & Facebook` / `● Connected · posts daily at 12:30 PM` / `Turn your articles into Instagram and Facebook carousels, so people and AI tools find Vaultio.` / links `Why post?`, `Posting settings`. Grid of posted carousels with `Posted today`, `Posted yesterday`, `Posted on Oct 28`… (image previews). Data: `/meta-posting/feature-status`, `/meta-posting/posts`, `/meta-posting/settings`, `/:id/meta-posting/articles?days=`.
Settings (`/dashboard/settings/meta`, BLG): connected accounts (Facebook Page + IG `@vaultiohq`, `Posting` pills; `Reconnect`, `Validate`, `Disconnect`), **Review & post** (`Automatic` hands-off / `Automatic with review` approve first / `Manual` full control; rule text about unapproved posts), **Schedule** (weekday chips Sun–Sat, `Every day at 12:30` in timezone), **Content** (post categories Educational / Philosophical / Myth-busting / Storytelling — "4 enabled · we rotate between them"; image style `Photo realistic` vs other, example carousel 1 of 5; brand mark toggle).

## Settings > Reddit / Quora (`/dashboard/settings/reddit|quora`)
`Monitored keywords` / `New opportunities will be found based on these keywords` / `5/5 selected`: selected keyword chips (removable) + `Add more` + suggested keyword chips (e.g. `<competitor> alternatives`). Upsell `Need to monitor more keywords? Upgrade to Reddit+ to add 35 additional keywords…` `Get Reddit+`. Reddit only: `Subreddits to monitor (Optional) 4 selected` chips `r/seo r/homeservices r/aiseo r/marketing` — `By default, we monitor all subreddits unless selected`. Both: `Customize your replies (Optional)` textarea `Tell us how you'd like every Reddit reply to be written`.
**Backend:** daily job per keyword: Google search `site:reddit.com <kw>` (lastGoogleCheckedAt) + Reddit API (lastRedditCheckedAt) → candidate threads → LLM scores relevance/engagement/recency → opportunityScore → suggested comment written in brand voice (mentions brand alongside 1–2 others). Plans cap keywords (5; 40 with +).

# 08 · Reporting — `/:locale/dashboard/reporting`

Screenshots `08-reporting-1..2.png`, `G08-goleta-reporting-*.png`; rendered template `api/agency-reporting-preview.html` (open in a browser — this is the exact PDF HTML).
Header: H1 `Client reporting`, sub `Build a branded PDF for this client from the data already in this workspace.` Right: chip `✉ Monthly email • On` (opens auto-send settings: recipient email, on/off) and black `⬇ Download PDF`.
Left panel: period select `📅 Previous month ⌄  Sep 1 – Sep 30, 2026`; `SECTIONS 11 of 12 on`; list of section toggles (red switches) with title + one-line description: `Achievements – Everything earned so far` (expanded explanation: "The big picture: everything this site has earned since you started… running totals"), `Summary line – One line on Google traffic` (off), `Search totals – The headline Google numbers`, `Search chart – Google visits day by day`, `Countries – Where visitors came from`, `Top pages – Pages with the most visits`, `Keywords – What people searched for`, `Authority – Sites linking to this one`, `Content that landed – New articles that did best`, `Site health – Problems found on the site`, `Where people mentioned you – Reddit and Quora answers`, `AI search visibility – Mentions in AI assistants`.
Right: live A4 preview (iframe of HTML; `● preview is current`, toggles `A4` / `Fit`). Report content: header logo + site URL + period; KPI grid (`AD SPEND SAVED $29.7`, `BACKLINK COST SAVED $4.3K`, `IMPRESSIONS 6.3K`, `VISITORS FROM ARTICLES 11`, `VISITORS FROM AI 25`, `YOUR SITE'S AUTHORITY 42`); `Google search` (Total clicks 35 ▲16.7%, Total impressions 7,348 ▲12.6%, Average position 15.4 ▲4.4 places, chart clicks vs impressions); `Where your visitors are`; `Pages doing the work`; `Keywords bringing visitors`; `Content that landed`; `Authority`; `Site health`; `Where people mentioned you`; `AI search visibility`.
Data: `GET /agency-reporting/availability?period=previous_month`, `GET /agency-reporting/settings` (`autoSend, recipientEmail, kpiMetrics, blockToggles`), `POST /agency-reporting/preview {period, blocks, kpiMetrics}` → HTML (re-POSTed on each toggle); `GET /agency-reporting/pdf` (download); monthly cron emails PDF. Product note: "Have 2 or more sites? Open Reporting…".
