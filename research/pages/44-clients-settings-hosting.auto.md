# 44-clients-settings-hosting — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/clients/settings/hosting`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/44-clients-settings-hosting-1.png`, `screenshots/44-clients-settings-hosting-2.png`

## Visible text (main content, top → bottom)

```text
Hosting
Where your clients sign in and where their invites and password resets are sent from.
Hosting domain
Where your clients sign in. If you change it, click Setup pending at the top of this card to see the new DNS record.


Email sending domain
Invites and password resets are emailed from this domain. If you change it, click Setup pending at the top of this card to see the new DNS records.
```

## Headings

- H1: Hosting

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| INPUT | text | Hosting domain |  | app.vaultio.co  |
| INPUT | text | Email sending domain |  | app.vaultio.co  |

## API calls (`api/44-clients-settings-hosting.json`)

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
