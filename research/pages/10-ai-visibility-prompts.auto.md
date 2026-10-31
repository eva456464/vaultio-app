# 10-ai-visibility-prompts — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/ai-visibility?tab=prompts`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/10-ai-visibility-prompts-1.png`, `screenshots/10-ai-visibility-prompts-2.png`

## Visible text (main content, top → bottom)

```text
Tracked prompts
AI visibility of your brand over time.
Manage prompts
Need more prompts?
Track more of the questions your buyers ask AI.
See prompt packs
Prompts
Intent
Vaultio mentioned in
Vaultio sentiment

How do I rank higher on Google?
Awareness	-	-	

My business isn’t showing up in search
Awareness	-	-	

Best marketing for plumbers
Research	-	-	

Tools for ranking on ChatGPT as a contractor
Research	-	-	

what do users say about local SEO services for contractors
Comparison	-	-	

is Scorpion worth it for getting more plumbing leads
Comparison	-	-	

what is local SEO for home service businesses
Learning	-	-	

What helps contractors rank on Google?
Research	-	-	

local SEO services for plumbing contractors in Ventura County
Buying intent	-	-	

cheapest HVAC marketing agencies in Ventura County 2026
Buying intent	-	-
```

## Headings

- H1: Tracked prompts

## Buttons / links (text [lucide icon] -> href)

- Manage prompts [icon:lucide-settings2]
- See prompt packs

## Lucide icons used

- lucide-settings2
- lucide-info
- lucide-chevron-right

## Tables

- headers: ['Prompts', 'Intent', 'Vaultio mentioned in', 'Vaultio sentiment', ''] · rows rendered: 10
- sample: `[["How do I rank higher on Google?", "Awareness", "-", "-", ""], ["My business isn’t showing up in search", "Awareness", "-", "-", ""], ["Best marketing for plumbers", "Research", "-", "-", ""], ["Tools for ranking on ChatGPT as a contractor", "Research", "-", "-", ""]]`

## Images

- ChatGPT | https://app.vaultio.co/_next/image?url=%2Flogos%2Fchatgpt-logo.png&w=32&q=75
- Claude | https://app.vaultio.co/logos/claude-ai-icon.svg

## API calls (`api/10-ai-visibility-prompts.json`)

### `GET /api/llm-visibility/prompt-allowance` → 200
Response shape:
```json
{
 "baseLimit": "int",
 "limit": "int",
 "activeCount": "int"
}
```

### `GET /api/llm-visibility/prompts` → 200
Response shape:
```json
[
 {
  "id": "int",
  "orgWebsiteId": "int",
  "prompt": "string: How can contractors get more local leads?",
  "intent": "string: awareness",
  "isActive": "bool",
  "lastCheckedAt": "null",
  "createdAt": "string: 2026-06-27T05:57:03.898Z",
  "updatedAt": "string: 2026-06-27T05:57:03.898Z",
  "tierLabel": "string: Other",
  "providers": [],
  "providersWithMentions": [],
  "sentiment": "null"
 }
]
```
