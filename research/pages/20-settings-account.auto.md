# 20-settings-account — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/settings/account`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/20-settings-account-1.png`, `screenshots/20-settings-account-2.png`

## Visible text (main content, top → bottom)

```text
Profile
Your name, email, password and platform language.
Personal details
Your personal account details
Name

Email
knightsdamian@gmail.com
Change password
Dashboard Language


English
Session
Sign out of your account on this device.
Log out
Danger zone
Delete your account. You'll have 14 days to change your mind before deletion becomes permanent.
Delete account
```

## Headings

- H1: Profile
- H2: Personal details
- H2: Session
- H2: Danger zone

## Buttons / links (text [lucide icon] -> href)

- Change password
- (Select your interface language) [icon:lucide-info]
- English [icon:lucide-chevron-down]
- Log out [icon:lucide-log-out]
- Delete account

## Lucide icons used

- lucide-info
- lucide-chevron-down
- lucide-log-out

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| INPUT | text |  | John Wick | Damian Knights  |

## API calls (`api/20-settings-account.json`)

### `GET /api/integrations` → 200
Response shape:
```json
{
 "wordpress": "null",
 "wordpressCom": "null",
 "wix": "null",
 "shopify": "null",
 "webflow": "null",
 "webhook": "null",
 "wordpressWebhook": "null",
 "bigcommerce": "null",
 "snapps": "null",
 "ghost": "null",
 "gohighlevel": "null",
 "blog": "null",
 "apiKey": "string: [REDACTED]",
 "apiKeySource": "null",
 "nextjsBlogConnected": "bool"
}
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

### `GET /api/auth/sign-in-methods` → 200
Response shape:
```json
{
 "data": {
  "hasPassword": "bool"
 }
}
```
