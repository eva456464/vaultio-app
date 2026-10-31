# 40–47 · Agency mode ("Manage clients") — `/:locale/clients/*`

Screenshots `40-clients-*.png`, `41-clients-invoices-*.png`, `42…46-clients-settings-*.png`, `47-clients-add-client-modal-1.png`, `50-header-website-selector.png`, `51-header-avatar-menu.png`. Dossiers `pages/4x-*.auto.md`. Docs `docs/whitelabel.md`.

**Shell:** selector shows 👥 `Manage clients`; header right = avatar initials (`DK`) → menu `Log out`. Sidebar label `CLIENT MANAGEMENT`: `Clients`, `Invoices`, `Settings`.

## Clients — `/clients`
H1 `Welcome back, Damian` / `Manage your client sites and grow their visibility across Google and AI search.`; right: outlined `Manage all subscriptions` (opens Stripe customer portal — `POST /subscriptions/create-portal-session`; not clicked).
Card `Your clients (2)` / `View and manage all your client websites.`; search input `Search clients`; black `+ Add client`.
Table: `WEBSITE` (site logo in rounded square + domain bold + full URL grey) · `LANGUAGE` (flag + `English`) · `SUBSCRIPTION` (green `● Active` pill; others e.g. trialing/canceled/paused) · `DATE ADDED` (`Jun 27, 2026`) · arrow button (aria `Preview of the vaultio.co client dashboard`) → switches selected site and opens its `/dashboard/overview`. Row click does the same. Hidden/duplicate sites (`isHidden`, not_started) are not listed.
Data: `GET /organization/get-org-websites` (with `subscriptions[]`), `/whitelabel/setup`.

**Add client dialog:** title `Your clients`, sub `With just a few clicks, you can add more clients to your account.`; `CLIENT WEBSITES` + `2 sites` with rows (globe icon, domain, language chip `EN`); promo `% Unlock bulk discounts — Adding more clients? Talk to our team about pricing for your agency.` + `Book a call →`; footer `Close` (outlined) / `+ Add new client` (black) → onboarding `select-website` in client mode (creates org website; not clicked).

## Invoices — `/clients/invoices`
`Invoices` / `All invoices across your client websites.` + `Manage all subscriptions`. Table `Client · Invoice ID · Billing Date · Amount · Status (Paid) · Invoice PDF (Download)`. Data `GET /subscriptions/organization-invoices` → `[{id, created, amount_due, currency, status, invoice_pdf, websiteUrl}]`.

## Agency settings — `/clients/settings/*`
Settings nav: `Profile`, `Members`, `Branding`, `Hosting`, `Talk with team`.
- **Profile:** same as dashboard Profile (name, email, change password, language, log out, delete account).
- **Branding:** `What your clients see when they sign in.` Agency name, Logo (`Upload a logo`), Favicon (`Upload a favicon`), Primary color, Accent color. (`POST /whitelabel/setup`, `/whitelabel/logo`.)
- **Hosting:** `Where your clients sign in and where their invites and password resets are sent from.` `Hosting domain` (+ status / `Setup pending` with CNAME e.g. `cf1fa72d4a49c931.vercel-dns-016.com.`), `Email sending domain` (Resend DKIM/SPF/MX records with status pills).
- **Members:** `Workspace name`; `Members & roles` + `Add member`; table Member (avatar initials, name, email) · Role (Admin/Member) · Status (Active/Pending) — members can be scoped to specific client sites (`websiteAccess`).
- **Talk with team:** `Your account manager helps you set up, onboard clients and grow your agency.` / `Book a call` / `Pick a time that suits you. Calls take about 15 minutes.` / `Book a call` (external scheduler).

## White-label mechanics (for the rebuild)
- Agency org has a `WhitelabelConfig`; any request to the configured `domain` renders the same Next.js app with brandName/logo/favicon/colors (cookie `whitelabel_config`, CSS var `--brand-accent`). Title tag becomes `<brandName> - Get Google and ChatGPT Traffic on Autopilot`.
- Clients are invited as members (with site access) and sign in at the agency domain; invite/password emails sent from `sendingDomain` via Resend.
- Agency pays per site (Stripe subscriptions per org website); volume discounts by site count.
