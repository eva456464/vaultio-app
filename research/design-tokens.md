# Design tokens & system

Measured with `getComputedStyle` on app.vaultio.co (white label) at 1728×939 viewport. Raw dumps: `raw/tokens-overview.json`, `raw/css-vars.txt` (all 639 CSS custom properties). Stack: **Tailwind CSS v4** (default palette vars present) + custom theme vars, shadcn/Radix-style components, **lucide-react** icons (names like `lucide-calendar-days`, `lucide-sparkles`, `lucide-arrow-right-left`, `lucide-pencil`, `lucide-trash2` — every page's icon list is in `pages/*.auto.md`), Recharts for charts, TipTap/ProseMirror editor.

## Typography
| Role | Font | Size / weight / line-height / tracking | Color |
|---|---|---|---|
| Body default | **Plus Jakarta Sans** (variable 200–800; `--font-sans`) | 16px / 400 / 24px | `#000` |
| Page H1 (`Good evening, Damian`, `Blog content`) | **Raleway** (`--font-heading`, 100–900) | 24px / 600 / 32px / −0.6px (−0.025em) | `#221F1F` (`--color-ink`) |
| Card title H2 (`What your agents did`) | Raleway | 22px / 600 / 32px / −0.44px | `#221F1F` |
| Achievement title | Raleway | 24px / 600 / 32px / −0.48px | `#221F1F` |
| Eyebrow label (`AGENT ACTIVITIES`, `ORGANIC WINS`, `WHAT WE LEARNED`) | Plus Jakarta Sans | 11–12px / 600 / 16px / 0.12em, UPPERCASE | **brand accent** `var(--brand-accent,#E8541E)` → Vaultio `#E94545` |
| Sidebar nav item | **Inter** (`--font-inter`) | 14px / 500 (active 600) / 20px | `#3A3D44` (active `#1F1F1F`) |
| Sidebar section label (`ANALYTICS`) | Plus Jakarta Sans | 11px / 500 / 16.5px / 1.1px UPPERCASE | `#8A8F98` |
| Header selector label `WEBSITE` | Plus Jakarta Sans | 9.5px / 600 / 12px / 0.3px UPPERCASE | `#6B7280` |
| Sub/secondary text | Plus Jakarta Sans | 14px / 500 | `#221F1F`; muted `#6B7280` (`--color-ink-secondary`), subtle `#9CA3AF` (`--color-ink-subtle`) |
| Table header | Plus Jakarta Sans | 12px / 500 | `#7B7B7B` |
| Table cell | Plus Jakarta Sans | 12px / 500 | `#5F5F5F` |
| Small meta (`Next milestone: 20`) | Plus Jakarta Sans | 10px / 500 / 14px | `#6B7280` |
| Code | Fira Code (`--font-code`) | — | — |
Fonts self-hosted via `next/font` (`/_next/static/media/*.woff2`); Plus Jakarta Sans, Inter, Raleway, Fira Code. Tailwind text scale: xs .75rem, sm .875rem, base 1rem, lg 1.125rem, xl 1.25rem, 2xl 1.5rem, 3xl 1.875rem; custom `--text-page-title: 1.5rem/2rem`, `--text-tag-text: 12px`.

## Colors
**Brand (white-label driven):** `primaryColor` from whitelabel config (`#E94545` Vaultio) → `--brand-accent` used for eyebrow labels, `NEW` tags, active accents, red CTA buttons (`Open settings`), report accent. BLG default accent `#E8541E`/`#F25533` (`--color-secondary`), BLG primary `#0F0A0A`.

| Token | Value | Use |
|---|---|---|
| ink | `#221F1F` | headings, primary text, black pill buttons (`Looks good`) |
| ink-secondary | `#6B7280` | secondary text |
| ink-subtle | `#9CA3AF` | placeholders, faint text |
| page background | white `#FFFFFF`; content areas light grey `#F9FAFB` / `#FAFAF8` (`--settings-bg`) | |
| header bg | `#FFFEFE` | top bar |
| card bg | `#FFFFFF` | |
| card border | `#EEEEEE` 1px | cards, chips |
| control border | `#E5E7EB` / `#E6E8EC` | buttons, inputs, selector |
| nav active bg | `#F3F4F5` | sidebar active item (+ 3px dark left indicator bar) |
| chip bg | `#F9FAFB` + border `#EEEEEE` | "What you offer" chips |
| success green text | `#06704F` | `CONGRATULATIONS!`, `View proof` |
| green pill bg / border | `#EEF8F1` / `#CDEBD7` | `● Agents running`, `● Live` |
| status PUBLISHED pill | green text `#16A34A`-ish on `#F0FDF4`, with check icon | calendar |
| status QUEUED pill | amber text on `#FEFCE8` with border, dot | calendar |
| severity pills | Medium = amber/orange, Low = grey/blue | site health |
| settings | `--settings-border #E5E7EB`, `--settings-title #101828`, `--settings-label #45505E` | settings pages |
| chart series | Direct orange `#F97316`-ish, Other teal, Organic Search blue `#3B82F6`, AI Search purple `#8B5CF6`, Paid green | traffic charts |
| other theme vars | `--color-accent #FFE4E0`, `--color-accent-blue #2A76F6`, `--color-success #2EE5AC`, `--color-primary-orange #FA5C12`, `--color-shopify #95BF46` | |

**Achievement card gradient:** `radial-gradient(120% 60% at 50% 0%, rgba(79,209,163,.22) 0%, transparent 70%), linear-gradient(#fff, #fff …)` — mint glow from the top, white base; 2 stacked "cards" peeking below; confetti dots in red/orange/yellow/green/pink; 3D coin/badge illustrations (images).
**Language upsell banner:** pale green gradient bg with dotted pattern, green border, dark green pill CTA `Unlock Spanish →` (`#2F6F4F`-ish).
**Report (PDF) palette** (from `api/agency-reporting-preview.html`): `--accent #E94545`, `--ink #15171C`, `--muted #656C7A`, `--faint #99A0AD`, `--line #E4E6EB`, `--wash #F3F4F7`, good `#1D6B4A`/`#EEF4F0`, bad `#9A5340`/`#FBEAE6`, warn `#8A6320`/`#FDF3E2`; fonts Roboto + IBM Plex Mono; A4 with 13mm margins.

## Radii, borders, shadows
`--radius: .5rem` (lg = 8px, md 6px, sm 4px), xl 12px, 2xl 16px, 3xl 24px.
- Main cards: **24px** radius, 1px `#EEEEEE` border, no/very soft shadow.
- Sidebar nav item: 10px radius, 40px tall, padding 0 10px.
- Website selector: 10px radius, 1px `#E6E8EC` border, ~276×50px, two-line (label + domain) with flag/logo icon and chevron.
- Buttons/pills/chips: fully rounded (`9999px`); small buttons 13px/500, padding 0 16px, ~32–36px tall. Black filled (`#221F1F`) primary; white outlined secondary; red filled for brand CTA.
- Thumbnails: 12px radius. Calendar day cards: ~8px radius, light border.
- Dialogs: ~16px radius, white, centered, dim overlay; header title 24px Raleway; footer buttons full-width split (`Close` outlined / primary black).

## Layout & spacing
- **Header:** height ≈ 76px (top bar with logo 40px square at left (Vaultio favicon logo; BLG shows full "BabyLoveGrowth.ai" wordmark), website selector, right side icons: bell (`Product updates`) in a 36px light-grey circle; BLG adds a "book" docs icon; agency mode shows avatar initials circle `DK`).
- **Sidebar:** width **248px**, white, right border; items 225×40; groups separated by thin dividers; section label `ANALYTICS`; collapsible groups with chevron (`›` rotates ⌄), children indented with a vertical tree line. Footer: `Sidebar` label + two toggle icons (expanded / collapsed mode). BLG only: promo card carousel above footer (G2 Review "Get $50 Discount", LinkedIn Post "Get $20 Discount", Yearly plan "Save 40%") with dots + `Next ›`.
- **Content:** greeting/page header band ~120px with bottom border; content padding ~48px left/right at desktop, cards gap 32px; max content width fluid. Settings pages: own left sub-nav (groups ACCOUNT / WHITELABEL / BUSINESS & BRAND / ARTICLES / INTEGRATIONS / SOCIALS; `← Back to dashboard`) and centered form column ~770px.
- Spacing scale: Tailwind 4px base (`--spacing: .25rem`).

## Responsive
- ≥768px (`md`): fixed 248px sidebar visible at 768/1024/1280+.
- <768px: sidebar hidden; header shows `Menu` (hamburger) button, logo, bell, settings gear; menu opens a full-screen sheet (`role=dialog`) with: close ×, logo, bell, gear; website selector full-width; nav with section labels **ACTIONS** (Blog content, Backlinks, Site health, Socials, Reporting), **ANALYTICS**, **OTHER** (Settings). Screenshots `80-mobile-overview.png`, `81-mobile-menu-open.png`. Containers use `@container` queries (`@2xl:text-xs`).

## Assets
- Vaultio logo/favicon: `https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/whitelabel/vaultio/vaultio_favicon.png` (served via `/_next/image?url=…&w=128|384`).
- Site logo (Vaultio org website): `…/storage/v1/object/public/user-uploads/org-website-41420/logo-1783405856651.png`.
- BLG wordmark: `https://www.babylovegrowth.ai/logos/logoBlack.svg`; G2 logo `/logos/G2Logo-Red.svg`.
- Achievement badge art, empty-state illustrations: Next/Image static assets (see screenshots).
- Country flags: circular flag icons next to languages.
