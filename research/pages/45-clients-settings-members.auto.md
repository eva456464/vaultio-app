# 45-clients-settings-members — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/clients/settings/members`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/45-clients-settings-members-1.png`, `screenshots/45-clients-settings-members-2.png`

## Visible text (main content, top → bottom)

```text
Members
Name your workspace and manage who has access to it.
Workspace name
This name is shown across your team workspace
Workspace name

Members & roles
Add member
Member
Role
Status
VM
Vaultio Marketing VA
zepohd@gmail.com
Member
Active

D
damian
yungrichdj@icloud.com
Member
Active

G
gkahn810
gkahn810@gmail.com
Member
Pending

DK
Damian Knights
knightsdamian@gmail.com
Admin
Active
```

## Headings

- H1: Members
- H2: Workspace name
- H2: Members & roles

## Buttons / links (text [lucide icon] -> href)

- Add member [icon:lucide-plus]
- () [icon:lucide-ellipsis-vertical]

## Lucide icons used

- lucide-plus
- lucide-user
- lucide-ellipsis-vertical
- lucide-crown

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| INPUT | text |  | Your workspace | Vaultio Organization  |

## API calls (`api/45-clients-settings-members.json`)

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

### `GET /api/organization/get-org-websites` → 200
Response shape:
```json
{
 "message": "string: Organization websites fetched successfully",
 "data": [
  {
   "id": "int",
   "organizationId": "int",
   "url": "string: https://vaultio.co",
   "brandName": "string: Vaultio",
   "selectedLanguage": "string: en",
   "onboardingStatus": "string: not_started",
   "onboardingCompletedAt": "null",
   "brandColor": "string: #E94545",
   "brandSecondaryColor": "string: #000000",
   "logoUrl": "null",
   "screenshotUrl": "null",
   "createdAt": "string: 2026-05-07T15:11:02.994Z",
   "isHidden": "bool",
   "subscriptions": []
  }
 ]
}
```
