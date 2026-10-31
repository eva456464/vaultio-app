# G08-goleta-reporting — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/reporting`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/G08-goleta-reporting-1.png`, `screenshots/G08-goleta-reporting-2.png`

## Visible text (main content, top → bottom)

```text
Client reporting
Build a branded PDF for this client from the data already in this workspace.

Monthly email
Off
Download PDF

Previous month
Sep 1 – Sep 30, 2026
preview is current
A4
Fit
SECTIONS
12 of 12 on

Achievements
Everything earned so far

The big picture: everything this site has earned since you started working on it. These are running totals, not just this period.

Summary line
One line on Google traffic


Search totals
The headline Google numbers


Search chart
Google visits day by day


Countries
Where visitors came from


Top pages
Pages with the most visits


Keywords
What people searched for


Authority
Sites linking to this one


Content that landed
New articles that did best


Site health
Problems found on the site


Where people mentioned you
Reddit and Quora answers


AI search visibility
Mentions in AI assistants
```

## Headings

- H1: Client reporting
- H2: SECTIONS

## Buttons / links (text [lucide icon] -> href)

- Monthly email Off [icon:lucide-calendar-clock]
- Download PDF [icon:lucide-download]
- Previous month Sep 1 – Sep 30, 2026 [icon:lucide-calendar-days]
- A4
- Fit
- Achievements Everything earned so far
- (Achievements)
- Summary line One line on Google traffic
- (Summary line)
- Search totals The headline Google numbers
- (Search totals)
- Search chart Google visits day by day
- (Search chart)
- Countries Where visitors came from
- (Countries)
- Top pages Pages with the most visits
- (Top pages)
- Keywords What people searched for
- (Keywords)
- Authority Sites linking to this one
- (Authority)
- Content that landed New articles that did best
- (Content that landed)
- Site health Problems found on the site
- (Site health)
- Where people mentioned you Reddit and Quora answers
- (Where people mentioned you)
- AI search visibility Mentions in AI assistants
- (AI search visibility)

## Lucide icons used

- lucide-calendar-clock
- lucide-download
- lucide-calendar-days

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| BUTTON | button | Period |  | Previous month Sep 1 – Sep 30, 2026 closed |
| BUTTON | button | Achievements |  |  true |
| BUTTON | button | Summary line |  |  true |
| BUTTON | button | Search totals |  |  true |
| BUTTON | button | Search chart |  |  true |
| BUTTON | button | Countries |  |  true |
| BUTTON | button | Top pages |  |  true |
| BUTTON | button | Keywords |  |  true |
| BUTTON | button | Authority |  |  true |
| BUTTON | button | Content that landed |  |  true |
| BUTTON | button | Site health |  |  true |
| BUTTON | button | Where people mentioned you |  |  true |
| BUTTON | button | AI search visibility |  |  true |

## API calls (`api/G08-goleta-reporting.json`)

### `GET /api/agency-reporting/availability?period=previous_month` → 200
Response shape:
```json
{
 "range": {
  "from": "string: 2026-09-01",
  "to": "string: 2026-09-30"
 },
 "clamped": "bool",
 "dataThrough": "string: 2026-10-26",
 "blocks": {
  "achievements": {
   "available": "bool",
   "count": "int"
  },
  "summary": {
   "available": "bool",
   "count": "int"
  },
  "kpis": {
   "available": "bool",
   "count": "int"
  },
  "clicksChart": {
   "available": "bool",
   "count": "int"
  },
  "countries": {
   "available": "bool",
   "count": "int"
  },
  "pages": {
   "available": "bool",
   "count": "int"
  },
  "keywords": {
   "available": "bool",
   "count": "int"
  },
  "articles": {
   "available": "bool",
   "count": "int"
  },
  "backlinks": {
   "available": "bool",
   "count": "int"
  },
  "siteHealth": {
   "available": "bool",
   "count": "int"
  },
  "community": {
   "available": "bool",
   "count": "int"
  },
  "aiVisibility": {
   "available": "bool",
   "count": "int"
  }
 }
}
```

### `GET /api/agency-reporting/settings` → 200
Response shape:
```json
{
 "autoSend": "bool",
 "blockToggles": {
  "kpis": "bool",
  "pages": "bool",
  "summary": "bool",
  "articles": "bool",
  "keywords": "bool",
  "backlinks": "bool",
  "community": "bool",
  "countries": "bool",
  "siteHealth": "bool",
  "clicksChart": "bool",
  "achievements": "bool",
  "aiVisibility": "bool"
 },
 "kpiMetrics": [
  "string: clicks"
 ],
 "recipientEmail": "string: knightsdamian@gmail.com"
}
```

### `GET /api/organization` → 200
Response shape:
```json
{
 "message": "string: Organization fetched successfully",
 "data": {
  "id": "int",
  "name": "string: Vaultio Organization",
  "creatorId": "int",
  "gscCredentials": "null",
  "acquisitionChannel": "string: facebook",
  "createdAt": "string: 2026-05-07T15:10:56.356Z",
  "updatedAt": "string: 2026-08-05T02:16:56.138Z",
  "members": [
   {
    "id": "int",
    "email": "string: zepohd@gmail.com",
    "name": "string: Vaultio Marketing VA",
    "isActive": "bool",
    "role": "string: member",
    "stripeCustomerId": "null",
    "newsSubscribed": "bool",
    "isInvoiceEmailEnabled": "bool",
    "platformLanguage": "string: en",
    "referralCode": "string: YP556K96",
    "linkedinPostCompleted": "bool",
    "linkedinExperiencePostCompleted": "bool",
    "isG2ReviewCompleted": "bool",
    "hasWatchedWelcomeVideo": "bool",
    "hasSeenArticleHints": "bool",
    "watchedVideos": [],
    "completedSetupItems": [],
    "lastSeenProductUpdateAt": "string: 2026-10-09",
    "resendAbandonedStartedAt": "null",
    "resendChurnedStartedAt": "null",
    "resendOnboardingStartedAt": "null",
    "resendActiveUserStartedAt": "null",
    "deletionRequestedAt": "null",
    "lastLoginAt": "string: 2026-10-22T20:18:29.965Z",
    "createdAt": "string: 2026-07-18T17:36:13.801Z",
    "updatedAt": "string: 2026-10-22T20:18:29.965Z",
    "supabaseId": "string: 3a3f6160-6b46-4287-990b-1859a271c5c4",
    "organizationId": "int",
    "websiteAccess": [
     {
      "id": "…",
      "userId": "…",
      "orgWebsiteId": "…",
      "createdAt": "…",
      "updatedAt": "…",
      "orgWebsite": "…"
     }
    ]
   }
  ],
  "websites": [
   {
    "id": "int",
    "url": "string: https://vaultio.co",
    "creationSource": "string: web_app",
    "brandName": "string: Vaultio",
    "selectedLanguage": "string: en",
    "description": "string: Vaultio puts contractors at the top of Google SEO and AI sea",
    "targetAudience": [
     "string: home service contractors seeking to increase lead capture"
    ],
    "mainServices": [],
    "onboardingStatus": "string: completed",
    "lastCompletedOnboardingStep": "null",
    "includeYoutube": "bool",
    "youtubeChannel": "null",
    "includeCTAImage": "bool",
    "ctaSettings": {
     "map": {
      "lat": "…",
      "lng": "…",
      "address": "…",
      "enabled": "…",
      "mapsUrl": "…",
      "imageKey": "…",
      "imageUrl": "…",
      "placeName": "…"
     },
     "links": {
      "items": "…",
      "enabled": "…"
     },
     "contact": {
      "email": "…",
      "phone": "…",
      "enabled": "…",
      "whatsapp": "…"
     }
    },
    "includeCitation": "bool",
    "includeSourcesSection": "bool",
    "includeJsonLd": "bool",
    "includeFaqJsonLd": "bool",
    "includeInternalLinks": "bool",
    "includeToc": "bool",
    "includeTldr": "bool",
    "summaryStyle": "string: tldr",
    "includeRecommendedReads": "bool",
    "includePerspective": "bool",
    "mentionCompetitorsIfRelevant": "bool",
    "englishType": "string: american",
    "screenshotUrl": "string: https://media.babylovegrowth.ai/blog-images/organization-294",
    "screenshotLinkUrl": "null",
    "sitemapUrl": "string: https://vaultio.co/sitemap.xml",
    "promoWebsiteUrl": "string: https://vaultio.co",
    "exampleArticleUrl": "string: https://vaultio.co",
    "brandVoice": {
     "pacing_and_flow": "string: The pacing is rapid and dynamic, maintaining reader engageme",
     "tone_and_emotion": "string: The tone is urgent, confident, and persua
```

### `GET /api/organization/get-org-website` → 200
Response shape:
```json
{
 "message": "string: Organization website fetched successfully",
 "data": {
  "id": "int",
  "url": "string: https://goletapressurewashing.com",
  "creationSource": "string: web_app",
  "brandName": "string: Goleta Pressure Washing",
  "selectedLanguage": "string: en",
  "description": "string: Goleta Pressure Washing specializes in safe and effective ex",
  "targetAudience": [
   "string: homeowners needing dependable exterior cleaning services"
  ],
  "mainServices": [],
  "onboardingStatus": "string: completed",
  "lastCompletedOnboardingStep": "null",
  "includeYoutube": "bool",
  "youtubeChannel": "null",
  "includeCTAImage": "bool",
  "ctaSettings": {
   "links": {
    "items": [
     {
      "url": "…",
      "label": "…"
     }
    ],
    "enabled": "bool"
   }
  },
  "includeCitation": "bool",
  "includeSourcesSection": "bool",
  "includeJsonLd": "bool",
  "includeFaqJsonLd": "bool",
  "includeInternalLinks": "bool",
  "includeToc": "bool",
  "includeTldr": "bool",
  "summaryStyle": "string: tldr",
  "includeRecommendedReads": "bool",
  "includePerspective": "bool",
  "mentionCompetitorsIfRelevant": "bool",
  "englishType": "string: american",
  "screenshotUrl": "string: https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/p",
  "screenshotLinkUrl": "null",
  "sitemapUrl": "string: https://goletapressurewashing.com/sitemap.xml",
  "promoWebsiteUrl": "string: https://goletapressurewashing.com",
  "exampleArticleUrl": "string: https://goletapressurewashing.com/blog/black-streaks-santa-b",
  "brandVoice": {
   "pacing_and_flow": "string: The flow is smooth and methodical, guiding the reader step-b",
   "tone_and_emotion": "string: The tone is professional, informative, and reassuring, with ",
   "figurative_language": "string: Figurative language is minimal but effective, used primarily",
   "perspective_and_voice": "string: The voice is authoritative yet conversational, coming from t",
   "word_choice_and_vocabulary": "string: The vocabulary is precise and industry-specific yet accessib",
   "sentence_structure_and_complexity": "string: Sentences vary between simple and moderately complex, often ",
   "formatting_and_structural_elements": "string: The article uses clear subheadings to organize content logic",
   "level_of_formality_and_personalization": "string: The formality level is moderate—professional but not overly "
  },
  "articleInstructions": "null",
  "articleDisclaimer": "null",
  "researchUrls": [],
  "imageInstructions": "null",
  "instructionNotes": {},
  "createdAt": "string: 2026-08-05T00:30:15.488Z",
  "onboardingCompletedAt": "string: 2026-08-05T00:47:51.408Z",
  "reonboardedAt": "null",
  "brandColor": "string: #0B3050",
  "brandSecondaryColor": "string: #0E5FA6",
  "brandDescription": "string: Goleta Pressure Washing presents a professional and trustwor",
  "updatedAt": "string: 2026-10-30T11:00:05.814Z",
  "autoPublish": "bool",
  "citationRegion": "string: United States",
  "backlinksEnabled": "bool",
  "backlinksExchangeEligible": "bool",
  "isHidden": "bool",
  "domainRating": "int",
  "minBacklinkGiverDomainRating": "null",
  "industry": "string: home_services",
  "articleScheduleWeekdays": [
   "int"
  ],
  "improvementsEnabled": "bool",
  "improvementWeekdays": [
   "int"
  ],
  "improvementsAutoPublish": "bool",
  "apiKey": "string: [REDACTED]",
  "apiKeySource": "string: [REDACTED]",
  "bodyImageStyle": "string: realistic",
  "infographicStyle": "string: classic"
 }
}
```

### `POST /api/agency-reporting/preview` → 200
Request body:
```json
{
 "period": "previous_month",
 "blocks": {
  "kpis": true,
  "pages": true,
  "summary": true,
  "articles": true,
  "keywords": true,
  "backlinks": true,
  "community": true,
  "countries": true,
  "siteHealth": true,
  "clicksChart": true,
  "achievements": true,
  "aiVisibility": true
 },
 "kpiMetrics": [
  "clicks",
  "impressions",
  "position"
 ]
}
```
Response (text): `<!doctype html> <html lang="en"> <head> <meta charset="utf-8" /> <title>Vaultio — https://goletapressurewashing.com</title> <link rel="preconnect" href="https://fonts.googleapis.com" /> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /> <link rel="stylesheet" href="https://fonts.`
