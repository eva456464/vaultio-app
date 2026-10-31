# 24-settings-business — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/settings/business`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/24-settings-business-1.png`, `screenshots/24-settings-business-2.png`, `screenshots/24-settings-business-3.png`

## Visible text (main content, top → bottom)

```text
Business details
What your business does and who it serves — the context every article is written from.
About the business
Generate with AI
Business description

Business name


Industry


Your logo and brand colors live in Branding. Edit branding
Positioning and services
Positioning

282/500
What sets you apart from competitors.


What you sell

Edited by you on Oct 21, 2026
This list shows your services, plans and products, with their prices and pages. Articles use it to describe what you offer and what it costs, and to link to the right page. We fill it in from your website, so check that each row is correct.


Vaultio System
Product
·
vaultio.co/SaaSTools
$449
Per month

Meta Ads Management
Service
·
vaultio.co/MetaAds
$500
Per month

Google Ads Management
Service
·
vaultio.co/GoogleAds
$500
Per month

Local Service Ads
Service
·
vaultio.co/DFYServices
$500
Per month

AI SEO
Service
·
vaultio.co/AISEO
$449
Per month

Web Design
Service
·
vaultio.co/DFYServices
$449
Per month
Add offer
6 of 20
About your customers
Target audience

home service contractors seeking to increase lead capture

plumbers losing jobs to competitors

electricians needing improved online visibility

HVAC providers wanting quick lead response

contractors aiming to boost monthly job bookings

contractors looking to rank higher on google

home services companies that want to rank on chatgpt

seo for contractors

seo for local business

seo for plumbing

seo for hvac

seo for window cleaning

seo for painters

marketing for plumbers

marketing for roofers

marketing for hvac

marketing for construction

marketing for power washing

power washing marketing

seo for construction

ai seo for contractors


Target location

United States

Arizona
Arkansas
California
+12

Choose cities
Your website setup
Helps us understand where your articles will be published
Blog path URL


Sitemap URL

View detected links
```

## Headings

- H1: Business details
- H2: About the business
- H2: Positioning and services
- H2: About your customers
- H2: Your website setup

## Buttons / links (text [lucide icon] -> href)

- Generate with AI [icon:lucide-sparkles]
- (How your brand will be referenced in generated articles and Reddit comments.) [icon:lucide-info]
- (Used to match you with relevant backlink partners) [icon:lucide-info]
- Edit branding [icon:lucide-palette] -> /en/dashboard/settings/branding
- (A brief overview based on the services your website offers.) [icon:lucide-info]
- (The services and prices for them, listed on your website.) [icon:lucide-info]
- (Vaultio System)
- vaultio.co/SaaSTools [icon:lucide-external-link] -> https://vaultio.co/SaaSTools
- (Meta Ads Management)
- vaultio.co/MetaAds [icon:lucide-external-link] -> https://vaultio.co/MetaAds
- (Google Ads Management)
- vaultio.co/GoogleAds [icon:lucide-external-link] -> https://vaultio.co/GoogleAds
- (Local Service Ads)
- vaultio.co/DFYServices [icon:lucide-external-link] -> https://vaultio.co/DFYServices
- (AI SEO)
- vaultio.co/AISEO [icon:lucide-external-link] -> https://vaultio.co/AISEO
- (Web Design)
- Add offer [icon:lucide-plus]
- (List who are your customers (e.g. lawyers in Florida)) [icon:lucide-info]
- (Remove home service contractors seeking to increase lead capture) [icon:lucide-x]
- (Remove plumbers losing jobs to competitors) [icon:lucide-x]
- (Remove electricians needing improved online visibility) [icon:lucide-x]
- (Remove HVAC providers wanting quick lead response) [icon:lucide-x]
- (Remove contractors aiming to boost monthly job bookings) [icon:lucide-x]
- (Remove contractors looking to rank higher on google) [icon:lucide-x]
- (Remove home services companies that want to rank on chatgpt) [icon:lucide-x]
- (Remove seo for contractors) [icon:lucide-x]
- (Remove seo for local business) [icon:lucide-x]
- (Remove seo for plumbing) [icon:lucide-x]
- (Remove seo for hvac) [icon:lucide-x]
- (Remove seo for window cleaning) [icon:lucide-x]
- (Remove seo for painters) [icon:lucide-x]
- (Remove marketing for plumbers) [icon:lucide-x]
- (Remove marketing for roofers) [icon:lucide-x]
- (Remove marketing for hvac) [icon:lucide-x]
- (Remove marketing for construction) [icon:lucide-x]
- (Remove marketing for power washing) [icon:lucide-x]
- (Remove power washing marketing) [icon:lucide-x]
- (Remove seo for construction) [icon:lucide-x]
- (Remove ai seo for contractors) [icon:lucide-x]
- (Add target audience) [icon:lucide-plus] [disabled]
- United States [icon:lucide-chevron-down]
- Arizona Arkansas California +12 [icon:lucide-chevron-down]
- Choose cities [icon:]
- (Enter your blog's Home page URL (like https://yoursite.com/blog) so we can veri [icon:lucide-info]
- (We will analyze your sitemap to find internal linking opportunities.) [icon:lucide-info]
- View detected links -> /en/dashboard/settings/saved-pages

## Lucide icons used

- lucide-sparkles
- lucide-info
- lucide-palette
- lucide-package
- lucide-external-link
- lucide-chevron-down
- lucide-briefcase
- lucide-plus
- lucide-x

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| TEXTAREA | textarea | Business description | Enter a description of your business | Vaultio puts contractors at the top of Google SEO and AI search engines — and ke  |
| INPUT | text |  | e.g. brand | Vaultio  |
| SELECT | select-one | Industry |  | marketing  |
| TEXTAREA | textarea | Positioning | e.g. The only certified installer in the region, with a 10-year guarantee on every job. | Vaultio integrates proprietary AI for ultra-fast lead response, guarantees measu  |
| INPUT | text | Target audience | Add a target audience, e.g. lawyers in Florida |   |
| INPUT | text |  | https://yourwebsite.com/blog |   |
| INPUT | text | Sitemap URL | https://yourwebsite.com/sitemap.xml | https://vaultio.co/sitemap.xml  |

## API calls (`api/24-settings-business.json`)

### `GET /api/organization/business-profile` → 200
Response shape:
```json
{
 "data": {
  "servicesOffered": [
   {
    "kind": "string: product_line",
    "name": "string: Vaultio System",
    "sourceUrl": "string: https://vaultio.co/SaaSTools",
    "amount": "string: 449",
    "priceType": "string: from",
    "currency": "string: USD",
    "period": "string: month",
    "unit": "string"
   }
  ],
  "servicesOfferedUpdatedAt": "string: 2026-10-21T23:29:02.554Z",
  "servicesOfferedSource": "string: user",
  "positioning": "string: Vaultio integrates proprietary AI for ultra-fast lead respon",
  "businessType": "string: B2B Services"
 },
 "message": "string: Business profile fetched successfully"
}
```

### `GET /api/locations` → 200
Response shape:
```json
[
 {
  "locationCode": "int",
  "subLocations": [
   "int"
  ]
 }
]
```

### `GET /api/locations/regen-status` → 200
Response shape:
```json
{
 "status": "string: completed",
 "processedAt": "string: 2026-10-24T07:40:04.860Z"
}
```
