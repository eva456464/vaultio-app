# 11-ai-visibility-brands — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/ai-visibility?tab=brands-mentioned`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/11-ai-visibility-brands-1.png`, `screenshots/11-ai-visibility-brands-2.png`

## Visible text (main content, top → bottom)

```text
Brands mentioned
Brands AI recommends most often alongside yours
#	
Brand
Mentioned in
Visibility
Sentiment
#1	
Google
14/20	70%	
61
#2	
Google Search Console
3/20	15%	
50
#3	
Google Business Profile
3/20	15%	
67
#4	
Yelp
3/20	15%	
50
#5	
Clutch
3/20	15%	
50
#6	
Scorpion
3/20	15%	
67
#7	
Google Maps
2/20	10%	
50
#8	
BBB
2/20	10%	
50
#9	
Facebook
2/20	10%	
50
#10	
ChatGPT
2/20	10%	
50
Brands by prompt
Expand a prompt to see the brands AI mentioned in its answers
#
Prompts
Brands
Intent

#1
How do I rank higher on Google?
6 brands
Awareness

#2
My business isn’t showing up in search
5 brands
Awareness

#3
Best marketing for plumbers
7 brands
Research

#4
Tools for ranking on ChatGPT as a contractor
15 brands
Research

#5
what do users say about local SEO services for contractors
14 brands
Comparison

#6
is Scorpion worth it for getting more plumbing leads
4 brands
Comparison

#7
what is local SEO for home service businesses
7 brands
Learning

#8
What helps contractors rank on Google?
5 brands
Research

#9
local SEO services for plumbing contractors in Ventura County
15 brands
Buying intent

#10
cheapest HVAC marketing agencies in Ventura County 2026
13 brands
Buying intent
```

## Headings

- H1: Brands mentioned
- H3: #1 How do I rank higher on Google? 6 brands Awareness
- H3: #2 My business isn’t showing up in search 5 brands Awareness
- H3: #3 Best marketing for plumbers 7 brands Research
- H3: #4 Tools for ranking on ChatGPT as a contractor 15 brands Research
- H3: #5 what do users say about local SEO services for contractors 14 brands Comparison
- H3: #6 is Scorpion worth it for getting more plumbing leads 4 brands Comparison
- H3: #7 what is local SEO for home service businesses 7 brands Learning
- H3: #8 What helps contractors rank on Google? 5 brands Research
- H3: #9 local SEO services for plumbing contractors in Ventura County 15 brands Buying intent
- H3: #10 cheapest HVAC marketing agencies in Ventura County 2026 13 brands Buying intent

## Buttons / links (text [lucide icon] -> href)

- #1 How do I rank higher on Google? 6 brands Awareness [icon:lucide-chevron-down]
- #2 My business isn’t showing up in search 5 brands Awareness [icon:lucide-chevron-down]
- #3 Best marketing for plumbers 7 brands Research [icon:lucide-chevron-down]
- #4 Tools for ranking on ChatGPT as a contractor 15 brands Research [icon:lucide-chevron-down]
- #5 what do users say about local SEO services for contractors 14 brands Comparis [icon:lucide-chevron-down]
- #6 is Scorpion worth it for getting more plumbing leads 4 brands Comparison [icon:lucide-chevron-down]
- #7 what is local SEO for home service businesses 7 brands Learning [icon:lucide-chevron-down]
- #8 What helps contractors rank on Google? 5 brands Research [icon:lucide-chevron-down]
- #9 local SEO services for plumbing contractors in Ventura County 15 brands Buyin [icon:lucide-chevron-down]
- #10 cheapest HVAC marketing agencies in Ventura County 2026 13 brands Buying int [icon:lucide-chevron-down]

## Lucide icons used

- lucide-info
- lucide-chevron-down

## Tables

- headers: ['#', 'Brand', 'Mentioned in', 'Visibility', 'Sentiment'] · rows rendered: 10
- sample: `[["#1", "Google", "14/20", "70%", "61"], ["#2", "Google Search Console", "3/20", "15%", "50"], ["#3", "Google Business Profile", "3/20", "15%", "67"], ["#4", "Yelp", "3/20", "15%", "50"]]`

## API calls (`api/11-ai-visibility-brands.json`)

### `GET /api/llm-visibility/overall-insights` → 200
Response shape:
```json
{
 "visibilityScore": "int",
 "totalMentions": "int",
 "totalAnswers": "int",
 "totalPrompts": "int",
 "topSource": {
  "domain": "string: sianamarketing.com",
  "count": "int",
  "urls": [
   {
    "url": "string: https://www.sianamarketing.com/resources/top-local-seo-agenc",
    "sourceType": "string: resource_page"
   }
  ]
 },
 "topMentionedBrand": {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string"
 }
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

### `GET /api/llm-visibility/brands-mentioned` → 200
Response shape:
```json
[
 {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "float",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=407336` → 200
Response shape:
```json
[
 {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=407334` → 200
Response shape:
```json
[
 {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=407345` → 200
Response shape:
```json
[
 {
  "brandName": "string: ChatGPT",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=407346` → 200
Response shape:
```json
[
 {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=407341` → 200
Response shape:
```json
[
 {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=533742` → 200
Response shape:
```json
[
 {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=533740` → 200
Response shape:
```json
[
 {
  "brandName": "string: Clutch",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=533741` → 200
Response shape:
```json
[
 {
  "brandName": "string: Scorpion",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=556092` → 200
Response shape:
```json
[
 {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/brands-mentioned?promptId=598774` → 200
Response shape:
```json
[
 {
  "brandName": "string: Besson Digital",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```
