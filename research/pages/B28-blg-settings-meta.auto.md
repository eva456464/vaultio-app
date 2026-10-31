# B28-blg-settings-meta — raw capture dossier (auto-generated)
- **URL:** `https://www.babylovegrowth.ai/en/dashboard/settings/meta`
- **Title:** BabyLoveGrowth - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/B28-blg-settings-meta-1.png`, `screenshots/B28-blg-settings-meta-2.png`, `screenshots/B28-blg-settings-meta-3.png`, `screenshots/B28-blg-settings-meta-4.png`

## Visible text (main content, top → bottom)

```text
Instagram & Facebook
Carousel posts are generated from your articles, reviewed and posted to Meta.
See my posts
Connected accounts
Choose the Facebook Page and Instagram account your posts are published to.
Reconnect
Validate
Disconnect
POSTING TO


Vaultio
Facebook Page and its linked Instagram account
Connected
Facebook
Vaultio
Posting


Instagram
@vaultiohq
Posting

Review & post
Who approves posts and when they go out
Who approves posts

Automatic
Hands-off
Posts on its own

Automatic with review
Approve first
You approve, we post

Manual
Full control
You approve and post
Posts wait for your approval; approved posts go out at their scheduled time. A post not reviewed and approved before its scheduled time is NOT posted automatically — it waits until you post it manually.
Schedule
Every
Sun
Mon
Tue
Wed
Thu
Fri
Sat
Every day
at

in America/Los_Angeles · 12:30 UTC
Content
What each carousel looks like
Post categories
4 enabled · we rotate between them

Educational
Teach one practical takeaway per slide — numbers, steps, mistakes to avoid.

Philosophical
A reflective angle on your article's deeper theme.

Myth-busting
A common misconception confronted with your article's evidence.

Storytelling
A short narrative built from your article's material, ending in a lesson.
Image style
Example 1 of 5


Choose how your carousel images look. Both styles are shown on the same example post.


Photo realistic
Lifelike photography — editorial, studio, macro and lifestyle scenes.

Sketch
Hand-drawn illustration — ink & watercolor, flat vector and paper collage.
Text style
Only the slide text and the brand mark — the image is not affected


Bold & clean
Big modern type with key words in your brand color. Fits most brands.


Elegant
Refined serif type, centered and airy — beauty, wellness, luxury, professional services.


Playful
Loud extra-bold type with highlighted words — consumer, lifestyle, food, fitness.


Vintage
Classic display serif with an old-print feel — artisanal, heritage and craft brands.
Show brand name on slides
Your domain as a small mark on every slide. The link on the last slide always stays.

Applies to newly generated posts only.
```

## Headings

- H1: Instagram & Facebook
- H2: Connected accounts
- H2: Review & post
- H2: Content

## Buttons / links (text [lucide icon] -> href)

- See my posts [icon:lucide-arrow-up-right] -> /en/dashboard/socials?tab=meta
- Reconnect
- Validate
- Disconnect
- Automatic Hands-off Posts on its own
- Automatic with review Approve first You approve, we post
- Manual Full control You approve and post
- Sun
- Mon
- Tue
- Wed
- Thu
- Fri
- Sat
- Educational Teach one practical takeaway per slide — numbers, steps, mistakes to [icon:lucide-check]
- Philosophical A reflective angle on your article's deeper theme. [icon:lucide-check]
- Myth-busting A common misconception confronted with your article's evidence. [icon:lucide-check]
- Storytelling A short narrative built from your article's material, ending in a l [icon:lucide-check]
- (Previous example) [icon:lucide-chevron-left]
- (Next example) [icon:lucide-chevron-right]
- Photo realistic Lifelike photography — editorial, studio, macro and lifestyle sc
- Sketch Hand-drawn illustration — ink & watercolor, flat vector and paper collage
- Bold & clean Big modern type with key words in your brand color. Fits most brand [icon:lucide-check]
- Elegant Refined serif type, centered and airy — beauty, wellness, luxury, profes
- Playful Loud extra-bold type with highlighted words — consumer, lifestyle, food,
- Vintage Classic display serif with an old-print feel — artisanal, heritage and c

## Lucide icons used

- lucide-arrow-up-right
- lucide-facebook
- lucide-chevron-down
- lucide-check
- lucide-chevron-left
- lucide-chevron-right

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| INPUT | checkbox | Facebook · Vaultio |  | on True |
| INPUT | checkbox | Instagram · @vaultiohq |  | on True |
| SELECT | select-one |  |  | 05:30  |
| INPUT | checkbox | Show brand name on slides |  | on True |

## Images

-  | https://scontent-iad3-2.xx.fbcdn.net/v/t39.30808-1/830418422_122181699140704157_2360996740032572651_n.jpg?stp=cp0_dst-jpg_s50x50_tt6&_nc_cat=103&ccb=1-7&_nc_sid
-  | https://scontent-iad6-1.xx.fbcdn.net/v/t51.82787-15/759508801_18081214562280487_7226387566232492158_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=7d201b&_nc_ohc=5GQBI9KDKzs
- Photo realistic | https://www.babylovegrowth.ai/images/meta-style-examples/image-babylovegrowth-photo_realistic.jpg
- Sketch | https://www.babylovegrowth.ai/images/meta-style-examples/image-babylovegrowth-sketch.jpg
- Bold & clean | https://www.babylovegrowth.ai/images/meta-style-examples/text-photo_realistic-default.jpg
- Elegant | https://www.babylovegrowth.ai/images/meta-style-examples/text-photo_realistic-elegant.jpg
- Playful | https://www.babylovegrowth.ai/images/meta-style-examples/text-photo_realistic-playful.jpg
- Vintage | https://www.babylovegrowth.ai/images/meta-style-examples/text-photo_realistic-vintage.jpg

## API calls (`api/B28-blg-settings-meta.json`)

### `GET /api/meta-posting/settings` → 200
Response shape:
```json
{
 "message": "string: OK",
 "data": {
  "publishMode": "string: auto_review",
  "publishTime": "string: 12:30",
  "publishWeekdays": [
   "int"
  ],
  "postToFacebook": "bool",
  "postToInstagram": "bool",
  "generationEnabled": "bool",
  "showBrandMark": "bool",
  "enabledPostTypes": [
   "string: educational"
  ],
  "slideTextStyle": "string: default",
  "slideImageStyle": "string: photo_realistic",
  "publishConnectionId": "int"
 }
}
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
