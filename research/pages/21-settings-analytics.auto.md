# 21-settings-analytics — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/settings/analytics`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/21-settings-analytics-1.png`, `screenshots/21-settings-analytics-2.png`

## Visible text (main content, top → bottom)

```text
Analytics
Connect Google Analytics and Search Console to track how your articles perform.
Data sources
Track clicks, impressions, and AI traffic for every article — right from your dashboard.


Google Analytics 4
Connected
Track AI-driven traffic and measure content performance.
Manage


Google Search Console
Connected
Monitor organic search clicks and impressions.
Manage
```

## Headings

- H1: Analytics
- H2: Data sources

## Buttons / links (text [lucide icon] -> href)

- Google Analytics 4 Connected Track AI-driven traffic and measure content perform
- Google Search Console Connected Monitor organic search clicks and impressions. M

## Images

-  | https://app.vaultio.co/logos/integrations/ga4.svg
-  | https://app.vaultio.co/logos/integrations/google-search-console.svg

## API calls (`api/21-settings-analytics.json`)

### `GET /api/ga4/account-info` → 200
Response shape:
```json
{
 "message": "string: GA4 account info fetched successfully",
 "data": {
  "email": "string: knightsdamian@gmail.com",
  "name": "string: Damian Knights",
  "picture": "string: https://lh3.googleusercontent.com/a/ACg8ocKn1zclXsApjm0EbyUc"
 }
}
```

### `GET /api/gsc/account-info` → 200
Response shape:
```json
{
 "message": "string: GSC account info fetched successfully",
 "data": {
  "email": "string: knightsdamian@gmail.com",
  "name": "string: Damian Knights",
  "picture": "string: https://lh3.googleusercontent.com/a/ACg8ocKn1zclXsApjm0EbyUc"
 }
}
```

### `GET /api/gsc/generate-gsc-consent-url?redirectPath=%2Fdashboard%2Fsettings%2Fanalytics` → 200
Response shape:
```json
{
 "message": "string: URL generated successfully",
 "data": {
  "authUrl": "string: https://accounts.google.com/o/oauth2/v2/auth?access_type=off"
 }
}
```
