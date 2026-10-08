# Avensus Project Hub

An editable project-management web app using React, Vinext, Cloudflare Workers and D1 SQLite.

## Local development

```bash
pnpm install
pnpm dev
```

The dashboard is in `app/page.tsx`, styling in `app/globals.css`, API routes in `app/api`, and the relational schema in `db/schema.ts`.

## API

- `GET /api/projects` and `POST /api/projects`
- `GET /api/tasks?projectId=1` and `POST /api/tasks`

The first API request creates the required tables and indexes. D1 is configured as `DB` in `.openai/hosting.json`.
