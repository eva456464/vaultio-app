# 31-settings-quora — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/settings/quora`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/31-settings-quora-1.png`, `screenshots/31-settings-quora-2.png`

## Visible text (main content, top → bottom)

```text
Quora
Keywords we monitor on Quora, and how replies are written.
Quora Monitored keywords
New opportunities will be found based on these keywords
5/5 selected
best seo services in california
top seo companies for contractors
best digital marketing for contractors
top lead response tools for home services
best online marketing strategies in ventura county
Add more
top contractor marketing services in thousand oaks

best local seo for home service businesses

top ai solutions for small businesses

best visibility tools for contractors

top lead generation services in ventura county

best website optimization for contractors

top search ranking services in thousand oaks

best home service marketing strategies

top seo tools for contractors

best home improvement advertising in california


Need to monitor more keywords?
Upgrade to Quora+ to add 35 additional keywords and find more opportunities.
Get Quora+
Customize your replies
Optional
Tell us how you'd like every Quora reply to be written
```

## Headings

- H1: Quora
- H2: Quora Monitored keywords
- H2: Customize your replies

## Buttons / links (text [lucide icon] -> href)

- (Stop monitoring this keyword) [icon:lucide-x]
- top contractor marketing services in thousand oaks [disabled]
- (Delete keyword) [icon:lucide-x]
- best local seo for home service businesses [disabled]
- top ai solutions for small businesses [disabled]
- best visibility tools for contractors [disabled]
- top lead generation services in ventura county [disabled]
- best website optimization for contractors [disabled]
- top search ranking services in thousand oaks [disabled]
- best home service marketing strategies [disabled]
- top seo tools for contractors [disabled]
- best home improvement advertising in california [disabled]
- (Add) [icon:lucide-plus] [disabled]
- Get Quora+

## Lucide icons used

- lucide-x
- lucide-plus

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| INPUT | text |  | Add custom keyword |   |
| TEXTAREA | textarea |  | Write like a real person with firsthand experience. Keep the response easy to read and avoid generic AI phrasing. | Write like a real person with firsthand experience. Keep the response easy to re  |

## API calls (`api/31-settings-quora.json`)

### `GET /api/quora/configuration` → 200
Response shape:
```json
{
 "message": "string: OK",
 "data": {
  "keywords": [
   {
    "id": "int",
    "orgWebsiteId": "int",
    "keyword": "string: best seo services in california",
    "isActive": "bool",
    "lastGoogleCheckedAt": "string: 2026-08-07T08:21:27.793Z",
    "createdAt": "string: 2026-08-07T01:30:00.827Z"
   }
  ],
  "maxKeywords": "int",
  "replyInstructions": "string: Write like a real person with firsthand experience. Keep the",
  "nextRunAt": "string: 2026-08-14T00:00:00.000Z"
 }
}
```
