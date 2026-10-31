# B38-blg-settings-white-label — raw capture dossier (auto-generated)
- **URL:** `https://www.babylovegrowth.ai/en/dashboard/settings/white-label`
- **Title:** BabyLoveGrowth - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/B38-blg-settings-white-label-1.png`, `screenshots/B38-blg-settings-white-label-2.png`

## Visible text (main content, top → bottom)

```text
Branding and domains
Your agency's white-label brand and the domains your clients sign in at and get emails from.
Brand
What your clients see when they sign in.
Agency name


Hosting domain
Where your clients sign in. If you change it, click Setup pending at the top of this card to see the new DNS record.


Email sending domain
Invites and password resets are emailed from this domain. If you change it, click Setup pending at the top of this card to see the new DNS records.


Logo

Upload a logo
Favicon

Upload a favicon
Primary color

#

Accent color

#
```

## Headings

- H1: Branding and domains
- H2: Brand

## Buttons / links (text [lucide icon] -> href)

- (Shown in the sidebar, in your clients' emails and on their reports. Your client [icon:lucide-info]
- (Shown in the sidebar, on your clients' sign-in screen and on their reports.) [icon:lucide-info]
- Upload a logo [icon:lucide-upload]
- (The small icon in your clients' browser tab.) [icon:lucide-info]
- Upload a favicon [icon:lucide-upload]
- (Replaces our orange accents in your clients' dashboard. Buttons and text keep t [icon:lucide-info]
- (Toggle color picker)
- (Used for secondary accents across your clients' dashboard, like badges and high [icon:lucide-info]

## Lucide icons used

- lucide-info
- lucide-upload

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| INPUT | text | Agency name |  | Vaultio  |
| INPUT | text | Hosting domain |  | app.vaultio.co  |
| INPUT | text | Email sending domain |  | app.vaultio.co  |
| INPUT | text | Primary color | 000000 | E94545  |
| INPUT | text | Accent color | 000000 | 000000  |

## Images

- Vaultio | https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/whitelabel/vaultio/vaultio_favicon.png
-  | https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/whitelabel/vaultio/vaultio_favicon.png

## API calls (`api/B38-blg-settings-white-label.json`)

### `GET /api/whitelabel/setup` → 200
Response shape:
```json
{
 "config": {
  "id": "int",
  "organizationId": "int",
  "domain": "string: app.vaultio.co",
  "brandName": "string: Vaultio",
  "primaryColor": "string: #E94545",
  "secondaryColor": "string: #000000",
  "logo": "string: https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/p",
  "favicon": "string: https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/p",
  "sendingDomain": "string: app.vaultio.co",
  "defaultLanguage": "string: en",
  "googleClientId": "null",
  "supabaseRedirectConfigured": "bool",
  "wantsWhitelabel": "bool",
  "createdAt": "string: 2026-07-12T11:55:26.433Z",
  "updatedAt": "string: 2026-10-10T18:08:34.675Z"
 },
 "appDomain": {
  "ok": "bool",
  "data": {
   "domain": "string: app.vaultio.co",
   "verified": "bool",
   "misconfigured": "bool",
   "recommendedCname": "string: cf1fa72d4a49c931.vercel-dns-016.com.",
   "verification": []
  }
 },
 "emailDomain": {
  "ok": "bool",
  "data": {
   "id": "string: e930ceac-5c67-458b-a8f8-de00f2db6090",
   "name": "string: app.vaultio.co",
   "status": "string: verified",
   "region": "string: us-east-1",
   "records": [
    {
     "record": "string: DKIM",
     "name": "string: resend._domainkey.app",
     "value": "string: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDOxyJOmZRKQ+wSCv2NYf",
     "type": "string: TXT",
     "status": "string: verified",
     "ttl": "string: Auto"
    }
   ]
  }
 }
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
    "lat": "float",
    "lng": "float",
    "address": "string: 1870 Laurelwood CT",
    "enabled": "bool",
    "mapsUrl": "string: https://maps.app.goo.gl/yjq7noC9anrrHXJt8",
    "imageKey": "string: 34.27335,-119.54228,#e94545",
    "imageUrl": "string: https://media.babylovegrowth.ai/blog-images/cta-maps/org-web",
    "placeName": "string: Vaultio"
   },
   "links": {
    "items": [
     {
      "url": "…",
      "label": "…"
     }
    ],
    "enabled": "bool"
   },
   "contact": {
    "email": "null",
    "phone": "null",
    "enabled": "bool",
    "whatsapp": "null"
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
   "tone_and_emotion": "string: The tone is urgent, confident, and persuasive, designed to e",
   "figurative_language": "string: Figurative language is minimal; however, the copy uses vivid",
   "perspective_and_voice": "string: The perspective is second person ('you'), speaking directly ",
   "word_choice_and_vocabulary": "string: Vocabulary is straightforward, action-oriented, and business",
   "sentence_structure_and_complexity": "string: Sentences are short, direct, and impactful, often fragments ",
   "formatting_and_structural_elements": "string: The formatting relies heavily on capitalization for emphasis",
   "level_of_formality_and_personalization": "string: Formality is moderate; professional yet approachable, avoidi"
  },
  "articleInstructions": "string: Never use AI buzzwords. Write genuine, useful, EEAT-focused ",
  "articleDisclaimer": "null",
  "researchUrls": [],
  "imageInstructions": "string: Make images bold and attention-grabbing, like a scroll-stopp",
  "instructionNotes": {
   "images": {
    "revisions": [
     {
      "at": "…",
      "added": "…",
      "source": "…",
      "removed": "…",
      "summary": "…",
      "settings": "…"
     }
    ],
    "unsupported": []
   },
   "writing": {
    "revisions": [
     {
      "at": "…",
      "added": "…",
      "source": "…",
      "removed": "…",
      "summary": "…",
      "settings": "…"
     }
    ],
    "unsupported": []
   },
   "reviewedAt": "string: 2026-10-24T03:21:22.632Z"
```
