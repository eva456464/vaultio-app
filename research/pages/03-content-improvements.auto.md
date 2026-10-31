# 03-content-improvements — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/content-plan/improvements`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/03-content-improvements-1.png`, `screenshots/03-content-improvements-2.png`

## Visible text (main content, top → bottom)

```text
Blog content
View your content calendar and improvements made to existing articles.
Content Calendar
Improvements
Beta
Improved Articles
Below you can find articles which need to be improved to start ranking better on Google and AI search.
How it works
Scanning for opportunities
We're watching how your published articles perform in Google Search. The moment a page is worth improving, it'll show up here.
Next scan Nov 2
```

## Headings

- H1: Blog content
- H2: Improved Articles
- H3: Scanning for opportunities

## Buttons / links (text [lucide icon] -> href)

- Content Calendar [icon:lucide-calendar-days] -> /en/dashboard/content-plan
- Improvements Beta [icon:lucide-sparkles] -> /en/dashboard/content-plan/improvements
- How it works [icon:lucide-info]

## Lucide icons used

- lucide-calendar-days
- lucide-sparkles
- lucide-info
- lucide-radar

## API calls (`api/03-content-improvements.json`)

### `GET /api/article-improvements/candidates` → 200
Response shape:
```json
[]
```

### `GET /api/article-improvements/settings` → 200
Response shape:
```json
{
 "improvementsEnabled": "bool",
 "improvementWeekdays": [
  "int"
 ],
 "improvementsAutoPublish": "bool",
 "gscConnected": "bool",
 "hasUpdateCapableIntegration": "bool"
}
```

### `GET /api/article-improvements/pending-count` → 200
Response shape:
```json
{
 "pendingCount": "int"
}
```

### `GET /api/article-improvements` → 200
Response shape:
```json
[]
```
