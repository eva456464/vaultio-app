# Framer plugin

Imports a website's published articles into a Framer CMS collection, from the app's content API
(`GET /api/integrations/v1/articles?status=published` and `GET /v1/articles/:id`, `X-API-Key`).
Clients create the key in Settings → Publishing → Framer, where a guide walks them through the
setup.

- **Configure** (opening the plugin): asks for the API key and, under "Use a different API address",
  the app's address (for agencies on their own domain), then imports.
- **Sync** (the Sync button on the collection in Framer's CMS): imports again without a panel.
- Each import fetches only new and changed articles (by `updated_at`), removes articles that were
  unpublished or deleted, and orders the collection newest first.
- Fields: Title, Content (formatted text, HTML), Cover image, Meta description, Excerpt, Published,
  Updated, Main keyword, Language, Original address. Field ids never change, so pages bound to them
  keep working.

The API address and the time of the newest imported article are saved as plugin data on the
collection (Framer allows 2 kB per entry). The API key is a secret, so it stays in the editor's
browser (localStorage), as Framer recommends: another editor enters it once on their own computer.

## Build and publish

Copy `.env.example` to `.env.local` and set `VITE_BRAND_NAME` and `VITE_API_BASE` (the production
app address followed by `/api/integrations`). Also set the plugin's name in `framer.json`.

```bash
npm install
```

```bash
npm run dev
```

starts a local HTTPS server and prints the link that opens it in Framer
(https://framer.com/plugins/open). The app must allow the dev origin (`https://localhost:5173` is
allowed by default).

```bash
npm run pack
```

builds `plugin.zip`, which is submitted on Framer's developer site. Then set `FRAMER_PLUGIN_URL`
in the app's environment to the marketplace page.

## Test

```bash
API_BASE=http://localhost:3000/api/integrations API_KEY=<key> npm test
```

runs the sync against a running app with a stand-in collection.
