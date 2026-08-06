# Zebvix API Server

Fastify 5 backend foundation for Zebvix Exchange.

## Current phase

This service is complete through Phase 1 only. It currently provides infrastructure and operational endpoints, not exchange-domain functionality.

No authentication, admin routes, database schema, ledger, balances, wallets, trading, deposits, withdrawals, workers, or WebSockets are implemented.

For the complete project-level handoff, see:

```text
../../docs/phase-1-backend-foundation.md
```

## Commands

From the repository root:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run test
```

`dev` builds the ESM bundle and then starts it. This artifact uses the managed API workflow in Replit.

## Environment

Copy the template before local development:

```bash
cp .env.example .env
```

Required:

```dotenv
DATABASE_URL=postgres://postgres:postgres@localhost:5432/zebvix
```

Development defaults:

```dotenv
NODE_ENV=development
PORT=8080
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000
BULLMQ_PREFIX=zebvix
```

`DATABASE_URL` is always required. `REDIS_URL` defaults to localhost in development/test and must be explicitly provided in production.

## Infrastructure

Start local dependencies from the repository root:

```bash
docker compose up -d
docker compose ps
```

The API expects:

- PostgreSQL on port `5432`
- Redis on port `6379`

## Routes

### Liveness

```text
GET /health
GET /healthz
GET /api/health
GET /api/healthz
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

### Readiness

```text
GET /ready
GET /api/ready
```

Readiness pings PostgreSQL and Redis. It returns HTTP `200` only when both checks succeed and HTTP `503` otherwise.

### API docs

```text
GET /api/docs/
```

Swagger UI is bundled into the build output and served from `dist/static`.

## Runtime behavior

- Fastify binds to `0.0.0.0`.
- Default request body limit is 1 MiB.
- `x-request-id` is honored; otherwise a UUID is generated.
- Helmet, CORS, and rate limiting are registered globally.
- Normal request rate limit is 100 requests per minute.
- Pino redacts sensitive request and domain fields.
- PostgreSQL and Redis are closed during graceful shutdown.

## Test strategy

`tests/health.test.ts` uses Fastify inject and mocked dependency methods. It validates the standard health response without requiring live infrastructure.

Run:

```bash
pnpm --filter @workspace/api-server run test
```

## Build note

The API is bundled with esbuild. Swagger UI files are copied into the output because the runtime serves them as static assets. If the build process changes, preserve the `dist/static` copy behavior or `/api/docs/` will not work in the bundled service.

## Adding future modules

Future domain modules should not place business logic directly in `routes/`. Use a predictable structure:

```text
src/modules/<module>/
├── <module>.route.ts
├── <module>.controller.ts
├── <module>.service.ts
├── <module>.repository.ts
├── <module>.schema.ts
└── <module>.types.ts
```

Domain APIs should use `/api/v1`. Health endpoints remain compatibility infrastructure paths.

## Safety boundary

Do not add exchange tables or financial workflows to this artifact until Phase 2 is explicitly approved. PostgreSQL must remain authoritative for financial state; Redis is not a source of truth for balances or ledger records.