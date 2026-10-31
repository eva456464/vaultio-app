# 02 · Blog content (Content Calendar) + 03 Improvements + 18 Article detail/editor

## Blog content — `/:locale/dashboard/content-plan`
Screenshots: `02-blog-content-1..3.png`, `02c-blog-calendar-today.png`, `02d-blog-calendar-next-month.png`, `02f-blog-queued-hover.png`, docs images `docs/img/content-plan-*.png`, `change-topic*.png`, `content-instruction*.png`, `content-delete*.png`. Docs: `docs/dashboard-content-plan.md`, `docs/dashboard-article-quality.md`.

**Header:** H1 `Blog content` + ⓘ tooltip (`Articles are generated everyday before 11AM UTC.`); sub `View your content calendar and improvements made to existing articles.`
**Tabs** (underline, red active bar): `📅 Content Calendar` (→ content-plan) · `✦ Improvements` + grey `Beta` chip (→ content-plan/improvements).
**Toolbar:** `View and manage your content plan.` + pills `✓ 126 PUBLISHED` (green) `● 29 QUEUED` (amber); right: `+ Add keywords` (outlined) → dialog `Add keywords` / `We'll group your keywords into article topics and schedule them on your calendar. Duplicate or off-topic keywords may be filtered out.` with a keywords textarea and `Add keywords` button (screenshot `74-blog-add-keywords-modal.png`), month switcher `Oct 2026 ‹ ›` (aria `Previous month` / `Next month`; client-side over the full plan).
**Language upsell banner** (dismissable ×): flag icon, `You're invisible to 800M+ Spanish speakers right now | Add new language and expand your visibility today!`, green pill `Unlock Spanish →`.
**Calendar grid:** Mon–Sun columns, week rows, day number top-left; days outside month greyed; today cell blue border + blue circle number + `TODAY` label. One card per day:
- *Published card:* `✓ PUBLISHED` green pill, title (3-line clamp), divider, footer: small engine icon (Google / ChatGPT / Claude / Gemini / Perplexity logo — decorative per-article "optimized for" icon) + underlined article type label (`Explainer Article`, `How To Article`, `Listicle Article`). Click → article detail `/dashboard/articles/:articleId`. Past months render faded.
- *Queued card:* `● QUEUED` amber pill, keyword (as title), `Difficulty: 6`, `Volume: 180`, optional `📍 Local` tag (local keyword), article type. Hover reveals icon buttons (aria): `Change topic` (arrow-right-left), `Add instructions` (pencil), `Delete` (trash). First-time coach-mark popover: `Hover any upcoming topic to: Change topic · Add instructions · Delete` + blue `Got it`.
  - Change topic → modal listing alternatives from `GET /content-plan/get-unused-clusters` (`keyword, searchVolume, keywordDifficulty, articleType, source`) → PATCH content plan item.
  - Add instructions → modal textarea (`userInstruction`, optional `supportUrl`, product selection from catalog) → PATCH.
  - Delete → confirm → DELETE.
- *Empty day:* blank.
**Data:** `GET /content-plan` (array of plan items with nested `article` and `keywordCluster.seedKeyword`, `generationStatus`), `GET /article-improvements/pending-count`.
**Backend:** planner keeps ~30 days of queued topics ahead (topicsPlanned activity), generates one article per scheduled weekday at ~04:00–11:00 UTC, publishes to the connected CMS, then `publishedUrl` is set.

## Improvements tab — `/:locale/dashboard/content-plan/improvements` (+ `/:id`)
`Improved Articles` / `Below you can find articles which need to be improved to start ranking better on Google and AI search.` / `How it works` link. Empty state (radar illustration): `Scanning for opportunities` / `We're watching how your published articles perform in Google Search. The moment a page is worth improving, it'll show up here.` / `Next scan Nov 2`. Data: `/article-improvements`, `/candidates`, `/settings`, `/pending-count`. Detail route shows before/after rewrite (not available — no items).

## Article detail — `/:locale/dashboard/articles/:id`
Screenshots: `18-article-detail-1..8.png`, `02b-blog-card-click.png`, `18b-article-ai-checks.png`, `18c-article-export-menu.png`, `18d-article-editor.png`.
**Top bar:** `←` (Back to articles), eyebrow `ARTICLE`, article title; right: `2343 words · 11 min read`, black button `✎ Edit article`.
**Body (left, reading view):** date `SEP 28, 2026` (right-aligned small caps), H1 title (Raleway ~36px), hero image (AI/stock), intro paragraph, `TL;DR:` bullet list, **CTA card** (`VAULTIO` eyebrow, `Turn Search Visibility Into Booked Jobs`, pitch, link `See how Vaultio works` → promo URL) — from `ctaCards`, `Table of Contents` (anchor links), sections (H2/H3, lists, tables, infographics, images), `FAQ`, `Sources`, `Recommended reads`.
**Right panel (≈340px, sticky):**
- `⚙ Customize writing settings` link.
- Expandable card `✦ AI Search optimized` / `✓ 10 checks passed` → expands to `Built for AI Search` with rationale paragraph (search intent, volume, difficulty, "None of your 554 page titles or headings uses this exact phrase…") and checklist: Answer-first writing · Credible source · Optimal structure · Internal links · Statistics data points · Plagiarism check passed · Image alt texts · Semantic keywords · Optimized meta tags · JSON-LD schema.
- `Published URL` / `Live URL of the published article` — green dot + URL + external-link icon.
- `Article Data` / `Key metrics and performance indicators` — keyword box (`hvac google business profile`, `Search Vol: 40  Difficulty: 2`), metric rows with icons and green dots: Word Count 2,343 · Number of Keywords ⓘ 10 · Images 4 · Internal Links 9 · External Links 2.
- `Slug` / `The optimized article URL` (input). `Meta Description` / `Article description for search engines` (textarea, counter `155/160 characters`). `Featured Image` / `Main image displayed for the article` (thumbnail; `No AI watermark metadata` badge with shield icon).
- Footer: big green button `✓ Published` (status; unpublish action when clicked — not clicked) and outlined `Export Article ⌄` → menu `Download Markdown`, `Export as HTML`.
**Data:** `GET /articles/:id` (full article incl. `content` markdown, `htmlContent`, media, rationale, ctaCards, counts), `GET /content-plan`, `GET /content-plan/get-unused-clusters`, `GET /integrations`.

### Editor mode (same route, after `Edit article`)
Top bar: eyebrow `EDITING ARTICLE`, status `● No changes yet` (green dot; becomes unsaved indicator), `✕ Discard`, black `✓ Save & Close` (PUT `/articles/:id`). Title textarea (dashed border). **TipTap toolbar:** Undo, Redo | Bold, Italic, Underline, Strikethrough | H1, H2, H3, Paragraph | Bullet list, Numbered list, Blockquote, Horizontal divider | Align left/center/right | Link, Insert table, Insert image, Insert YouTube video | Clear formatting. Content is a ProseMirror document. Loads `GET /articles/:id/recommended-images` for image picker. Product update notes mention AI edits: select text → Rewrite / Shorten / Simplify / Turn into table; regenerate/upload images; side-by-side accept/reject (`rewrite-text`, assistant proposals endpoints).
