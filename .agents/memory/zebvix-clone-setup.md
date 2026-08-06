---
name: Zebvix clone setup
description: Post-clone state, known gaps, and required setup for the Enterprise-Exchange1 repo.
---

## What was cloned

Full clone of https://github.com/oiz-digital/Enterprise-Exchange1 into this workspace.

Artifacts present: `api-server` (Fastify 5, port 8080), `admin` (React+Vite admin panel, port 23744, path `/admin/`).

## Post-clone fixes applied

- `artifacts/admin/src/pages/UsersPage.tsx` was missing its `export default function UsersPage()` wrapper and state declarations (`searchTerm`, `statusFilter`, `kycFilter`, `setLocation`). Fixed by adding the function shell.
- DB schema pushed with `pnpm --filter @workspace/db run push` after the schema tables were missing.

## Known gaps after clone

- **Redis not running**: API server logs `ECONNREFUSED 127.0.0.1:6379` on every start. Redis is expected but not provisioned in this Replit environment. The server continues without it (degraded readiness).
- **No market data**: `seed:coins` must be run (`pnpm --filter @workspace/scripts run seed:coins`) to populate markets table before the Binance price feed starts.
- **index.css color placeholders**: `artifacts/admin/src/index.css` has `--background: red` and similar placeholder HSL values. The theme needs real HSL colors filled in.
- **index.css** for admin was scaffolded by `createArtifact`; original from repo should be compared and merged if needed.

**Why:** `createArtifact` was required to register the admin artifact (platform requires a fresh slug), which overwrote the scaffold files. The original source files were restored from `/tmp/admin-original` afterward.

## How to re-seed

```bash
pnpm --filter @workspace/scripts run seed:coins
pnpm --filter @workspace/scripts run seed:admin
pnpm --filter @workspace/scripts run seed:exchange
```
