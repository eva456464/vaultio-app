# 43-clients-settings-branding — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/clients/settings/branding`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/43-clients-settings-branding-1.png`, `screenshots/43-clients-settings-branding-2.png`

## Visible text (main content, top → bottom)

```text
Branding
What your clients see when they sign in.
Agency name


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

- H1: Branding

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
| INPUT | text | Primary color | 000000 | E94545  |
| INPUT | text | Accent color | 000000 | 000000  |

## Images

- Vaultio | https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/whitelabel/vaultio/vaultio_favicon.png
-  | https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/whitelabel/vaultio/vaultio_favicon.png

## API calls (`api/43-clients-settings-branding.json`)

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
