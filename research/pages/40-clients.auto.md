# 40-clients — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/clients`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/40-clients-1.png`, `screenshots/40-clients-2.png`

## Visible text (main content, top → bottom)

```text
Welcome back, Damian
Manage your client sites and grow their visibility across Google and AI search.
Manage all subscriptions
Your clients (2)
View and manage all your client websites.

Add client
WEBSITE	LANGUAGE	SUBSCRIPTION	DATE ADDED	Open client dashboard

vaultio.co
https://vaultio.co
English
Active	Jun 27, 2026	

goletapressurewashing.com
https://goletapressurewashing.com
English
Active	Aug 5, 2026
```

## Headings

- H1: Welcome back, Damian
- H2: Your clients (2)

## Buttons / links (text [lucide icon] -> href)

- Manage all subscriptions
- Add client [icon:lucide-plus]
- vaultio.co
- (Preview of the vaultio.co client dashboard) [icon:lucide-arrow-right]
- goletapressurewashing.com
- (Preview of the goletapressurewashing.com client dashboard) [icon:lucide-arrow-right]

## Lucide icons used

- lucide-search
- lucide-plus
- lucide-arrow-right

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| INPUT | search | Search clients | Search clients |   |

## Tables

- headers: ['WEBSITE', 'LANGUAGE', 'SUBSCRIPTION', 'DATE ADDED', 'Open client dashboard'] · rows rendered: 2
- sample: `[["vaultio.co https://vaultio.co", "English", "Active", "Jun 27, 2026", ""], ["goletapressurewashing.com https://goletapressurewashing.com", "English", "Active", "Aug 5, 2026", ""]]`

## Images

- https://vaultio.co | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dvaultio.co%26default%3Ddata%253Aimage%252Fsvg%252Bxml%2
- https://goletapressurewashing.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dgoletapressurewashing.com%26default%3Ddata%253Aimage%25

## API calls (`api/40-clients.json`)

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

### `GET /api/onboarding/status` → 200
Response shape:
```json
{
 "status": "string: completed"
}
```

### `GET /api/organization/language-upsell` → 200
Response shape:
```json
{
 "data": {
  "suggestion": {
   "nextProposedLanguageCode": "string: es"
  }
 },
 "message": "string: Language upsell resolved"
}
```

### `GET /api/users/me` → 200
Response shape:
```json
{
 "data": {
  "id": "int",
  "email": "string: knightsdamian@gmail.com",
  "name": "string: Damian Knights",
  "isActive": "bool",
  "role": "string: admin",
  "stripeCustomerId": "string: cus_UTQeBR3aZ4JKPx",
  "newsSubscribed": "bool",
  "isInvoiceEmailEnabled": "bool",
  "platformLanguage": "string: en",
  "referralCode": "string: T3YLMLLQ",
  "linkedinPostCompleted": "bool",
  "linkedinExperiencePostCompleted": "bool",
  "isG2ReviewCompleted": "bool",
  "hasWatchedWelcomeVideo": "bool",
  "hasSeenArticleHints": "bool",
  "watchedVideos": [],
  "completedSetupItems": [],
  "lastSeenProductUpdateAt": "string: 2026-10-23",
  "resendAbandonedStartedAt": "string: 2026-06-24T05:54:03.908Z",
  "resendChurnedStartedAt": "null",
  "resendOnboardingStartedAt": "null",
  "resendActiveUserStartedAt": "string: 2026-09-26T01:01:34.116Z",
  "deletionRequestedAt": "null",
  "lastLoginAt": "string: 2026-10-31T02:01:48.536Z",
  "createdAt": "string: 2026-05-07T15:10:56.359Z",
  "updatedAt": "string: 2026-10-31T02:01:48.536Z",
  "supabaseId": "string: cf01a7df-95e5-44bf-bf55-a261c2e300ea",
  "organizationId": "int",
  "websiteAccess": []
 },
 "message": "string: User fetched successfully"
}
```

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
