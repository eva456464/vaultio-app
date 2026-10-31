# Vaultio

AI agents that grow a website's traffic from Google and AI search: they analyze the site,
plan and write articles, earn backlinks, audit technical health and track AI visibility.
Agencies manage all their clients from one white-labeled dashboard.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the app and the agent engine work.

## Local development

Requirements: Node 20.9+, Postgres 14+.

```bash
cp .env.example .env          # set DATABASE_URL and BETTER_AUTH_SECRET
npm install
npm run db:migrate            # create tables
npm run db:seed               # dev account: demo@vaultio.co / vaultio-demo-2026
npm run dev:all               # web app on http://localhost:3000 + agents worker
```

Add a client from **Manage clients → Add client**. Onboarding starts immediately and its
progress shows on the client's Overview page.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run worker` | Background agents (onboarding + scheduled jobs) |
| `npm run dev:all` | Web app and worker together |
| `npm run typecheck` / `lint` | Checks |
| `npm run db:generate` | Create a migration after editing `src/db/schema` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Create the local dev account |
